// Polyfill for Claude's window.storage API.
// Routes getItem/setItem/removeItem through Tauri IPC,
// scoped to the file path of the component loaded in this window.
(function() {
  var invoke = window.__TAURI__.core.invoke;
  window.storage = {
    getItem: function(key) {
      var filePath = window.__TERRARIUM_FILE_PATH__ || '';
      if (!filePath) return Promise.resolve(null);
      return invoke('storage_get', { filePath: filePath, key: key }).then(function(r) {
        return r != null ? r : null;
      });
    },
    setItem: function(key, value) {
      var filePath = window.__TERRARIUM_FILE_PATH__ || '';
      if (!filePath) return Promise.resolve();
      return invoke('storage_set', { filePath: filePath, key: key, value: String(value) });
    },
    removeItem: function(key) {
      var filePath = window.__TERRARIUM_FILE_PATH__ || '';
      if (!filePath) return Promise.resolve();
      return invoke('storage_remove', { filePath: filePath, key: key });
    }
  };
})();
