/**
 * ブラウザでファイルとして保存させる。Blob の URL は使い終わったら必ず解放する。
 * （この関数だけが DOM に触る。中身を作る関数はすべて DOM なしで試験できる）
 */
export const saveFile = (data: string | Uint8Array, mime: string, fileName: string): void => {
  // Uint8Array は ArrayBuffer に写してから渡す（SharedArrayBuffer を受け付けない環境のため）
  const part = typeof data === 'string' ? data : data.slice().buffer;
  const url = URL.createObjectURL(new Blob([part], { type: mime }));
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    // クリックの直後に解放すると保存が始まらないブラウザがあるので、少し待つ
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
};
