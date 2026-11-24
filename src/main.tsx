import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// 書体はアプリに同梱する（CSP で外部フォントを読まないため）。
// 本文の BIZ UDPゴシックは Windows に標準で入っているのでそれを使い、Mac ではヒラギノに任せる
// 金額は英数字しか使わないので、英数字の分だけ同梱する（数百 KB の日本語の分は読まない）
import '@fontsource/biz-udpgothic/latin-400.css';
import '@fontsource/biz-udpgothic/latin-700.css';
import './styles/app.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Ensure there is an element with id="root" in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
