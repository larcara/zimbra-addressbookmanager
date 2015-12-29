// Saves options to chrome.storage
    function save_options() {
      var server = document.getElementById('server').value;
      var loginEmail = document.getElementById('loginEmail').value;
      var loginPassword = document.getElementById('loginPassword').value;
      chrome.storage.sync.set({
        server: server,
        loginEmail: loginEmail,
        loginPassword: loginPassword
      }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
          status.textContent = '';
        }, 750);
      });
    }

    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    function restore_options() {
      // Use default value color = 'red' and likesColor = true.
      chrome.storage.sync.get({
        server: "server",
        loginEmail: "loginEmail",
        loginPassword: "loginPassword"
      }, function(items) {
        document.getElementById('server').value = items.server;
        document.getElementById('loginEmail').value = items.loginEmail;
        document.getElementById('loginPassword').value = items.loginPassword;
      });
    }
    document.addEventListener('DOMContentLoaded', restore_options);
    document.getElementById('save').addEventListener('click',
        save_options);

    
     