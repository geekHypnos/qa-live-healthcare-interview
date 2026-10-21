import { reactive } from 'vue';
import { request, ApiError } from '../api/client';
import { authApi, type SessionIdentity } from '../api/auth';
import { verifyBeforeAction } from '../api/session';
import questionData from '../data/question-list.json';

export interface Doctor {
  id: string;
  username: string;
  name: string;
  title: string;
  department: string;
  avatar: string;
  experience: string;
  specialties: string[];
  isActive: boolean;
}

export interface Patient {
  id: string;
  name: string;
  birthday: string;
  phone: string;
  gender: string;
}

export interface Question {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  question: string;
  submitTime: string;
  status: 'pending' | 'answered';
  answer: string | null;
  answerTime: string | null;
}

interface State {
  doctors: Doctor[];
  doctorsLoading: boolean;
  doctorsError: string;
  sessionReady: boolean;
  sessionError: string;
  identity: SessionIdentity | null;
  questions: Question[];
  currentDoctor: Doctor | null;
  currentPatient: Patient | null;
}

const state = reactive<State>({
  doctors: [],
  doctorsLoading: false,
  doctorsError: '',
  sessionReady: false,
  sessionError: '',
  identity: null,
  questions: questionData as Question[],
  currentDoctor: null,
  currentPatient: null,
});

// 只在身份真正切换或认证操作开始时更新；同账号刷新不能取消正在提交的操作。
let authVersion = 0;
const identityKey = (identity: SessionIdentity | null) => identity
  ? `${identity.role}:${identity.accountId}:${identity.profile.id}` : '';

export const store = {
  state,

  async loadDoctors() {
    state.doctorsLoading = true;
    state.doctorsError = '';
    try { state.doctors = await request<Doctor[]>('/doctors'); }
    catch (error) { state.doctorsError = (error as Error).message; throw error; }
    finally { state.doctorsLoading = false; }
  },

  clearIdentity() {
    authVersion++;
    state.identity = null;
    state.currentDoctor = null;
    state.currentPatient = null;
    state.sessionReady = true;
  },

  applyIdentity(identity: SessionIdentity) {
    if (identityKey(state.identity) !== identityKey(identity)) authVersion++;
    state.identity = identity;
    state.currentPatient = identity.role === 'PATIENT' ? identity.profile : null;
    state.currentDoctor = identity.role === 'DOCTOR' ? identity.profile : null;
    state.sessionError = '';
    state.sessionReady = true;
  },

  async restoreSession() {
    const version = authVersion;
    state.sessionReady = false;
    try {
      const identity = await authApi.me();
      if (version !== authVersion) return; // 退出或新登录后的旧响应不能覆盖新状态。
      // 页面恢复时发现账号已被另一标签页更换，先清理旧页面而非沿用草稿。
      if (state.identity && identityKey(state.identity) !== identityKey(identity)) {
        this.clearIdentity();
        state.sessionError = '账号已切换，请重新登录';
      } else { this.applyIdentity(identity); }
    } catch (error) {
      if (version !== authVersion) return;
      if (error instanceof ApiError && error.status === 401) this.clearIdentity();
      else state.sessionError = (error as Error).message;
    } finally { if (version === authVersion) state.sessionReady = true; }
  },

  async login(username: string, password: string, role: 'PATIENT' | 'DOCTOR') {
    const version = ++authVersion;
    try {
      const identity = await authApi.login(username, password);
      if (version !== authVersion) throw new Error('登录请求已过期，请重试');
      if (identity.role !== role) {
        await authApi.logout();
        throw new Error(role === 'PATIENT' ? '请使用患者账号登录' : '请使用医生账号登录');
      }
      this.applyIdentity(identity);
      return identity;
    } catch (error) {
      if (version === authVersion) this.clearIdentity();
      throw error;
    }
  },

  async logout() {
    const version = ++authVersion;
    await authApi.logout();
    if (version === authVersion) this.clearIdentity();
  },

  async runAsCurrent<T>(action: () => T | Promise<T>): Promise<T> {
    const expected = state.identity;
    const version = authVersion;
    if (!expected) throw new Error('请先登录');
    try {
      return await verifyBeforeAction(expected, authApi.me, () => {
        if (version !== authVersion || identityKey(state.identity) !== identityKey(expected)) throw new Error('身份已变化，请重试');
        return action();
      });
    } catch (error) {
      // 网络故障保留身份以便重试；401 或身份变化不能继续使用旧草稿。
      if (version === authVersion && (!(error instanceof ApiError) || error.status === 401)) this.clearIdentity();
      throw error;
    }
  },

  getQuestionsByDoctor(doctorId: string): Question[] {
    return state.questions.filter(q => q.doctorId === doctorId);
  },

  getQuestionsByPatient(patientId: string): Question[] {
    return state.questions.filter(q => q.patientId === patientId);
  },

  addQuestion(question: Omit<Question, 'id' | 'submitTime' | 'status' | 'answer' | 'answerTime'>): Question {
    const newQuestion: Question = {
      ...question,
      id: `q${Date.now()}`,
      submitTime: new Date().toISOString(),
      status: 'pending',
      answer: null,
      answerTime: null,
    };
    state.questions.push(newQuestion);
    return newQuestion;
  },

  answerQuestion(questionId: string, answer: string) {
    const question = state.questions.find(q => q.id === questionId);
    if (question) {
      question.status = 'answered';
      question.answer = answer;
      question.answerTime = new Date().toISOString();
    }
  },

  markQuestionAsAnswered(questionId: string) {
    const question = state.questions.find(q => q.id === questionId);
    if (question) {
      question.status = 'answered';
      question.answer = '已口述解答';
      question.answerTime = new Date().toISOString();
    }
  },

  getDoctorByUsername(username: string): Doctor | undefined {
    return state.doctors.find(d => d.username === username);
  },

  getActiveDoctors(): Doctor[] {
    return state.doctors.filter(d => d.isActive);
  },

  getStatistics() {
    const totalDoctors = state.doctors.length;
    const totalQuestions = state.questions.length;
    const activeSessions = state.questions.filter(q => q.status === 'pending').length;
    const totalSessions = state.doctors.filter(d => d.isActive).length;

    return {
      totalDoctors,
      totalQuestions,
      activeSessions,
      totalSessions,
    };
  },
};
