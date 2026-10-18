/* Загрузка текста юридического документа с API сайта.
   Работает, когда страница открыта на том же домене, что и API (somaspace.ru). */

(function () {
  var API = '/api/v1/legals/get-legals';
  var root = document.getElementById('legal-root');
  if (!root) return;
  var code = root.getAttribute('data-code');

  fetch(API, { method: 'GET', credentials: 'omit', headers: { Accept: 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then(function (docs) {
      if (!Array.isArray(docs)) throw new Error('bad payload');
      var doc = docs.find(function (item) { return item.code === code; });
      if (!doc || !doc.body_html) {
        root.textContent = 'Документ не найден';
        return;
      }
      root.innerHTML = doc.body_html;
    })
    .catch(function () {
      root.innerHTML = 'Не удалось загрузить документ. Откройте <a href="https://somaspace.ru/legals">https://somaspace.ru/legals</a>';
    });
})();
