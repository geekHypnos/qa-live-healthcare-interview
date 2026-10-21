<template>
  <div class="doctor-room">
    <div class="room-container" v-if="currentDoctor">
      <div class="room-header">
        <div class="doctor-info">
          <img :src="currentDoctor.avatar" :alt="currentDoctor.name" class="doctor-avatar" />
          <div>
            <h1>{{ currentDoctor.name }}的诊室</h1>
            <p>{{ currentDoctor.title }} · {{ currentDoctor.department }}</p>
          </div>
        </div>
        <div class="room-actions">
          <a-button @click="copyRoomUrl">
            <CopyOutlined />
            复制诊室链接
          </a-button>
          <a-button danger @click="logout">
            <LogoutOutlined />
            退出登录
          </a-button>
        </div>
      </div>

      <div class="room-url">
        <a-alert
          :message="`诊室URL: ${roomUrl}`"
          type="success"
          show-icon
        />
      </div>

      <div class="questions-section">
        <div class="section-header">
          <h2>待响应问题 ({{ pendingQuestions.length }})</h2>
          <a-button type="primary" @click="refreshQuestions">
            <ReloadOutlined />
            刷新
          </a-button>
        </div>

        <a-empty v-if="pendingQuestions.length === 0" description="暂无待响应问题" />

        <div v-else class="questions-list">
          <div
            v-for="question in pendingQuestions"
            :key="question.id"
            class="question-card"
          >
            <div class="question-header">
              <div class="patient-info">
                <UserOutlined class="patient-icon" />
                <span class="patient-name">{{ question.patientName }}</span>
              </div>
              <span class="submit-time">{{ formatTime(question.submitTime) }}</span>
            </div>
            <div class="question-content">
              <p>{{ question.question }}</p>
            </div>
            <div class="question-actions">
              <a-button type="primary" @click="showAnswerModal(question)">
                <EditOutlined />
                文字回复
              </a-button>
              <a-button @click="markAsAnswered(question.id)">
                <CheckOutlined />
                标记已解答
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <div class="answered-section">
        <h2>已解答问题 ({{ answeredQuestions.length }})</h2>
        <a-collapse v-if="answeredQuestions.length > 0" accordion>
          <a-collapse-panel
            v-for="question in answeredQuestions"
            :key="question.id"
            :header="`${question.patientName}: ${question.question.substring(0, 50)}...`"
          >
            <div class="answered-content">
              <p class="question-text"><strong>问题:</strong> {{ question.question }}</p>
              <p class="answer-text"><strong>回复:</strong> {{ question.answer }}</p>
              <p class="answer-time">回复时间: {{ formatTime(question.answerTime!) }}</p>
            </div>
          </a-collapse-panel>
        </a-collapse>
        <a-empty v-else description="暂无已解答问题" />
      </div>
    </div>

    <a-modal
      v-model:open="answerModalVisible"
      title="回复问题"
      @ok="submitAnswer"
      @cancel="closeAnswerModal"
      :confirmLoading="submitting"
      :cancelButtonProps="{ disabled: submitting }"
      :closable="!submitting"
      :maskClosable="!submitting"
      :keyboard="!submitting"
    >
      <div v-if="selectedQuestion" class="modal-content">
        <div class="question-info">
          <p><strong>患者:</strong> {{ selectedQuestion.patientName }}</p>
          <p><strong>问题:</strong> {{ selectedQuestion.question }}</p>
        </div>
        <a-form-item label="您的回复">
          <a-textarea :disabled="submitting"
            v-model:value="answerText"
            :rows="6"
            placeholder="请输入您的专业建议和回复..."
          />
        </a-form-item>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import {
  CopyOutlined,
  LogoutOutlined,
  ReloadOutlined,
  UserOutlined,
  EditOutlined,
  CheckOutlined
} from '@ant-design/icons-vue';
import { store } from '../store';
import type { Question } from '../store';

const route = useRoute();
const router = useRouter();

const username = route.params.username as string;
const currentDoctor = computed(() => store.state.currentDoctor);
const roomUrl = computed(() => `${window.location.origin}/consultation/${username}`);

const pendingQuestions = computed(() =>
  currentDoctor.value
    ? store.getQuestionsByDoctor(currentDoctor.value.id).filter(q => q.status === 'pending')
    : []
);

const answeredQuestions = computed(() =>
  currentDoctor.value
    ? store.getQuestionsByDoctor(currentDoctor.value.id).filter(q => q.status === 'answered')
    : []
);

const answerModalVisible = ref(false);
const selectedQuestion = ref<Question | null>(null);
const answerText = ref('');
const submitting = ref(false);

watch(() => [store.state.sessionReady, currentDoctor.value, route.params.username], () => {
  if (!store.state.sessionReady) return;
  if (!currentDoctor.value || currentDoctor.value.username !== route.params.username) {
    answerModalVisible.value = false; selectedQuestion.value = null; answerText.value = '';
    void router.replace('/doctor/login');
  }
}, { immediate: true });

const copyRoomUrl = () => {
  navigator.clipboard.writeText(roomUrl.value);
  message.success('诊室链接已复制到剪贴板');
};

const logout = async () => {
  try { await store.logout(); message.success('已退出登录'); await router.push('/'); }
  catch (error) { message.error((error as Error).message); }
};

const refreshQuestions = () => {
  message.success('已刷新问题列表');
};

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm');
};

const showAnswerModal = (question: Question) => {
  selectedQuestion.value = question;
  answerText.value = '';
  answerModalVisible.value = true;
};

const closeAnswerModal = () => {
  if (submitting.value) return;
  answerModalVisible.value = false;
  selectedQuestion.value = null;
  answerText.value = '';
};

const submitAnswer = async () => {
  if (!answerText.value.trim() || !selectedQuestion.value || submitting.value) return;
  // 保存问题 ID 与文本，后续仅使用本次提交快照。
  const payload = { id: selectedQuestion.value.id, doctorId: selectedQuestion.value.doctorId, answer: answerText.value.trim() };
  submitting.value = true;
  try {
    await store.runAsCurrent(() => {
      if (payload.doctorId !== currentDoctor.value?.id) throw new Error('问题不属于当前医生');
      store.answerQuestion(payload.id, payload.answer);
    });
    message.success('回复成功'); submitting.value = false; closeAnswerModal();
  } catch (error) { message.error((error as Error).message); }
  finally { submitting.value = false; }
};

const markAsAnswered = async (questionId: string) => {
  try {
    await store.runAsCurrent(() => {
      const question = store.state.questions.find(q => q.id === questionId);
      if (question?.doctorId !== currentDoctor.value?.id) throw new Error('问题不属于当前医生');
      store.markQuestionAsAnswered(questionId);
    });
    message.success('已标记为已解答');
  } catch (error) { message.error((error as Error).message); }
};
</script>

<style scoped>
.doctor-room {
  min-height: calc(100vh - 64px);
  padding-top: 64px;
  background: #f0f2f5;
}

.room-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.room-header {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.doctor-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.doctor-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.doctor-info h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
}

.doctor-info p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.room-actions {
  display: flex;
  gap: 12px;
}

.room-url {
  margin-bottom: 24px;
}

.questions-section,
.answered-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-header h2,
.answered-section h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 24px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-icon {
  font-size: 16px;
  color: #1890ff;
}

.patient-name {
  font-weight: 600;
  color: #333;
}

.submit-time {
  font-size: 12px;
  color: #999;
}

.question-content {
  margin-bottom: 12px;
}

.question-content p {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin: 0;
}

.question-actions {
  display: flex;
  gap: 12px;
}

.answered-content {
  padding: 12px 0;
}

.question-text,
.answer-text {
  margin-bottom: 12px;
  line-height: 1.6;
}

.answer-time {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.modal-content .question-info {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.modal-content .question-info p {
  margin: 8px 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .room-header {
    flex-direction: column;
    gap: 16px;
  }

  .room-actions {
    width: 100%;
    flex-direction: column;
  }

  .question-actions {
    flex-direction: column;
  }
}
</style>
