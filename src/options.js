// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

(function(namespace) {

  if (namespace.options)
    return;

  // Option object.
  function Options() {
    this.instances_ = [];
  };

  var options = new Options();
  namespace.options = options;

  // Return the value for option.
  Options.prototype.instances = function() {
    return this.instances_;
  };

  // Sets the status text (with a timeout).
  Options.prototype.setStatusText = function(text, opt_timeout) {
    browser.getElement('status').innerText = text;
    setTimeout(
        function() { browser.getElement('status').innerText = ''; },
        opt_timeout || 350);
  };

  // Add a new Gerrit instance, or enable the instance if it already exists.
  Options.prototype.addGerritInstance = function(host, name, enabled) {
    for (var i = 0; i < this.instances_.length; i++) {
      var instance = this.instances_[i];
      if (instance.host === host) {
        instance.enabled = true;
        instance.name = name;
        browser.getElement('instance-' + i).checked = 'true';
        return;
      }
    }

    this.instances_.push({ host: host, name: name, enabled: enabled });
    var instance_index = this.instances_.length - 1;
    var instance = this.instances_[instance_index];

    // Calling setAttribute('for', checkbox_id) does not work during the
    // construction, so wait until the element have been created to set it.
    var labels = [];
    dombuilder.DomBuilder.attach(browser.getElement('instances'))
      .begin('tr')
        .begin('td')
          .begin('label')
            .appendText(name)
            .withCurrentNode(function(node) { labels.push(node); })
          .end('label')
        .end('td')
        .begin('td')
          .begin('label')
            .appendText(host)
            .withCurrentNode(function(node) { labels.push(node); })
          .end('label')
        .end('td')
        .begin('td')
          .begin('input')
            .setAttribute('type', 'checkbox')
            .setAttribute('id', 'instance-' + instance_index)
            .setAttribute('checked', enabled)
            .withCurrentNode(function(node) {
              node.addEventListener('change', function() {
                instance.enabled = node.checked;
              });
            })
          .end('input')
        .end('td')
      .end('tr');

    labels.forEach(function(node) {
      node.setAttribute('for', 'instance-' + instance_index);
    })
  };

  // Restore the options from Chrome storage and update the option page.
  Options.prototype.loadOptions = function() {
    return gerrit.fetchAllInstances().then((function(instances) {
      instances.forEach((function(instance) {
        this.addGerritInstance(instance.host, instance.name, instance.enabled);
      }).bind(this));
    }).bind(this));
  };

  // Save the options to Chrome storage and update permissions.
  Options.prototype.saveOptions = function() {
    var origins = [];
    var options = { instances: this.instances_ };
    this.instances_.forEach(function(instance) {
      if (instance.enabled) {
        var match = config.ORIGIN_REGEXP.exec(instance.host);
        if (match !== null) {
          origins.push(match[1] + "/*");
        }
      }
    });
    return browser.setAllowedOrigins(origins)
      .then(function() {
        return browser.saveOptions(options);
      })
      .then((function() {
        this.setStatusText('Options saved.');
      }).bind(this))
      .catch((function(error) {
        this.setStatusText(String(error));
      }).bind(this));
  };

  // Main method.
  Options.prototype.onLoaded = function() {
    this.loadOptions();

    browser.getElement('add-button-name').pattern = '.+';
    browser.getElement('add-button-host').pattern = config.ORIGIN_PATTERN;
    browser.getElement('add-button').addEventListener('click', (function() {
      var host = browser.getElement('add-button-host').value;
      var name = browser.getElement('add-button-name').value

      var match = config.ORIGIN_REGEXP.exec(host);
      var host_is_valid = match !== null && match[0].length == host.length;
      if (host_is_valid && name.length !== 0) {
        this.addGerritInstance(host, name, true);
        browser.getElement('add-button-host').value = '';
        browser.getElement('add-button-name').value = '';
      } else {
        this.setStatusText('Incorrect values.');
      }
    }).bind(this));

    browser.getElement('save-button').addEventListener('click', (function() {
      this.saveOptions();
    }).bind(this));
  };

  // Called to initialize the options page.
  browser.callWhenLoaded(function () { options.onLoaded(); });

})(this);
