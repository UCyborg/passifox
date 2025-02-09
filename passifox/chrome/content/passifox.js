"use strict";

(function() {
  Components.utils.import("resource://gre/modules/Services.jsm");
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  XPCOMUtils.defineLazyServiceGetter(window, "kpf",
    "@hanhuy.com/login-manager-storage;1",
    Components.interfaces.nsILoginManagerStorage);

  function $(id) {
    return document.getElementById(id);
  }
  addEventListener('DOMContentLoaded', function f() {
    removeEventListener('DOMContentLoaded', f, false);
    let popup = $('contentAreaContextMenu');
    if (popup)
      popup.addEventListener("popupshowing", toggleItems, false);

    function showNotification(m, id) {
      if (id) {
        let notif = document.getElementById(id);
        if (notif)
          return notif;
      }
      let box = gBrowser.getNotificationBox(gBrowser.selectedBrowser);
      let n = box.appendNotification(m, null,
        "chrome://passifox/skin/keepass.png", 3, null);
      if (id)
        n.setAttribute("id", id);
      return n;
    }

    function toggleItems(e) {
      let textinput = gContextMenu.onTextInput;
      let password = false;
      let node = document.popupNode;
      $('kpf-insert-user').hidden = !textinput;
      $('kpf-context-sep').hidden = !textinput;

      if (node instanceof Components.interfaces.nsIDOMHTMLInputElement)
        password = node.type.toLowerCase() == "password";
      if (password && !node.form)
        $('kpf-insert-user').hidden = true;
      $('kpf-insert-pass').hidden = !password;
    }

    function getFields(u, p) {
      let form = u != null ? u.form : p.form;
      let input = null;
      // this suffers from the same bug as chromeipass did
      // inputs that are not in a form will result in an error
      if (form == null)
        return [u, p];
      for (let i = 0; i < form.elements.length; i++) {
        let e = form.elements[i];
        if (e instanceof Components.interfaces.nsIDOMHTMLInputElement) {
          if (u != null && u !== e &&
            e.type.toLowerCase() == "password") {
            p = e;
            break;
          }
          if (e.type.toLowerCase() != "password")
            input = e;
          if ((p != null & p == e)) {
            u = input;
            break;
          }
        }
      }

      return [u, p];
    }

    function fillLogin(u, p, login) {
      if (u != null)
        u.value = login['Login'];
      if (p != null)
        p.value = login['Password'];
    }

    function getLogin(both) {
      let node = gContextMenu.target;
      let url = gBrowser.currentURI.spec;
      let action = node.form ? node.form.action : null;
      let logins = kpf.wrappedJSObject._kpf.get_logins(
        url, action, true);
      if (logins.length > 0) {
        let node = gContextMenu.target;
        let u, p;
        if (!both) {
          p = node;
        } else {
          // TODO handle password,password user,pass fields
          let fields = node.type.toLowerCase() == "password" ? [null, node] : [node, null];
          [u, p] = getFields.apply(this, fields);
        }

        if (logins.length == 1) {
          fillLogin(u, p, logins[0]);
        } else {
          // For some reason, can't open a menupopup from here
          // use a select prompt instead
          let selected = {};
          let items = logins.map(function(i) {
            return i.Name + " - " + i.Login;
          });
          let r = Services.prompt.select(window,
            "Select a login", "Pick a login to fill in",
            logins.length, items, selected);
          if (r) {
            fillLogin(u, p, logins[selected.value]);
          }
        }
      } else {
        showNotification("No logins found");
      }
    }
    $('kpf-insert-user').addEventListener('command', function(e) {
      getLogin(true);
    }, false);
    $('kpf-insert-pass').addEventListener('command', function(e) {
      getLogin(false);
    }, false);
  }, false);
})();
