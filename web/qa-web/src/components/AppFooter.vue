<template>
  <a-layout-footer class="footer">
    <div class="footer-content">
      <div class="footer-section">
        <h3>QA Live Healthcare</h3>
        <p>{{ homeText('专业的在线医疗问诊平台') }}</p>
        <p>{{ homeText('为您提供便捷、专业的医疗咨询服务') }}</p>
      </div>
      <div class="footer-section">
        <h4>{{ homeText('快速链接') }}</h4>
        <ul>
          <li><a href="/">{{ homeText('首页') }}</a></li>
          <li><a href="/consultation">{{ homeText('问诊') }}</a></li>
          <li><a href="/doctors">{{ homeText('医生团队') }}</a></li>
          <li><a href="/about">{{ homeText('关于我们') }}</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h4>{{ homeText('联系我们') }}</h4>
        <p>{{ homeText('客服热线: 400-123-4567') }}</p>
        <p>{{ homeText('服务时间: 周一至周日 8:00-22:00') }}</p>
        <p>{{ homeText('邮箱: service@qalive.com') }}</p>
      </div>
      <div class="footer-section">
        <h4>{{ homeText('法律信息') }}</h4>
        <ul>
          <li><a href="#">{{ homeText('隐私政策') }}</a></li>
          <li><a href="#">{{ homeText('服务条款') }}</a></li>
          <li><a href="#">{{ homeText('医疗免责声明') }}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 QA Live Healthcare. All rights reserved.</p>
    </div>
  </a-layout-footer>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { t } from '../locales';
const route = useRoute();
const homeText = (text: string) => route.path === '/' ? t(text) : text;
</script>

<style scoped>
.footer {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 48px 24px 24px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
  margin-bottom: 32px;
}

.footer-section h3 {
  color: #fff;
  font-size: 24px;
  margin-bottom: 16px;
}

.footer-section h4 {
  color: #fff;
  font-size: 18px;
  margin-bottom: 16px;
}

.footer-section p {
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 8px;
  line-height: 1.8;
}

.footer-section ul {
  list-style: none;
  padding: 0;
}

.footer-section ul li {
  margin-bottom: 8px;
}

.footer-section ul li a {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.3s;
}

.footer-section ul li a:hover {
  color: #fff;
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.footer-bottom p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}
</style>
