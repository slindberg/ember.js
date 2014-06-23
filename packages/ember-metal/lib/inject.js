import { ComputedProperty } from "ember-metal/computed";
import { Descriptor } from "ember-metal/properties";
import { meta, inspect } from "ember-metal/utils";
import EmberError from "ember-metal/error";

/**
  Namespace for injection methods.

  @class inject
  @namespace Ember
  @todo is there a sane default to make this a convenience function like
        `Ember.computed` or `Ember.run`? Being alias for running one of its properties
        seems like an unnecessary redundancy that only makes API surface bigger
*/
export var inject = {
  /**
    Creates a property that lazily looks up another controller in the container.

    @method inject.controller
    @for Ember
    @param {String} [name] name of the controller to inject
    @return {Ember.InjectedProperty} injection descriptor instance
  */
  controller: function(name) {
    return new InjectedProperty('controller', name);
  }
};

/**
  Read-only property that looks up an object in the container

  @class InjectedProperty
  @namespace Ember
  @extends Ember.Descriptor
  @constructor
*/
export function InjectedProperty(type, name) {
  this._type = type;
  this._name = name;

  ComputedProperty.call(this, function(keyName) {
    return this.container.lookup(type + ':' + (name || keyName));
  }, { readOnly: true });
}

InjectedProperty.prototype = new Descriptor();

var InjectedPropertyPrototype = InjectedProperty.prototype;

InjectedPropertyPrototype.get = ComputedProperty.prototype.get;

InjectedPropertyPrototype.set = function(obj, keyName) {
  throw new EmberError('Cannot set injected property "' + keyName + '" on object: ' + inspect(obj));
};

InjectedPropertyPrototype.teardown = function(obj, keyName) {
  var meta = meta(obj);
  delete meta.cache[keyName];
  return null;
};

export function verifyInjectionDependencies(obj, m) {
  var descs = m.descs, injections = [], missing = [], key, desc, container, dependency, containerKey, i, l;

  for (key in descs) {
    desc = descs[key];
    if (desc instanceof InjectedProperty) {
      injections.push([ key, desc ]);
    }
  }

  if (injections.length) {
    container = obj.container;

    Ember.assert(inspect(obj) + ' defines an injected property, but ' +
                 "does not have a container. Ensure that the object was " +
                 "instantiated via a container.", container);

    for (i = 0, l = injections.length; i < l; i++) {
      dependency = injections[i];
      containerKey = dependency[1]._type + ':' + (dependency[1]._name || dependency[0]);

      if (!container.has(containerKey)) {
        missing.push(containerKey);
      }
    }

    if (missing.length) {
      throw new EmberError(inspect(obj) + " needs [ " + missing.join(', ') + " ] but " + (missing.length > 1 ? 'they' : 'it') + " could not be found");
    }
  }
}
