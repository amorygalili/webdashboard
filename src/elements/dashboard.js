import { LitElement } from 'lit-element';
import { isArray } from 'lodash';
import { add as addManager } from '../source-managers';

export default class Dashboard extends LitElement {

  constructor() {
    super();
    let providers = [{ 
      type: 'NetworkTables',
      settings: {
        address: 'localhost'
      }
    }];
    if (!isArray(this.providers) && typeof this.providers === 'object') {
      providers = [this.providers];
    } else if (isArray(this.providers)) {
      providers = this.providers;
    }

    for (let { type, name, settings } of providers) {
      addManager(type, name, settings);
    }
  }
}