import { LitElement, html, css } from 'lit-element';
import store from '../store';
import { connect } from 'pwa-helpers';
import { includeStyles } from '../render-utils';
import { getSubtable, getTypes } from 'assets/js/networktables';
import ObservableSlim from 'observable-slim';
import '../elements/components/dashboard-modal';
import { forEach } from 'lodash';

class DashboardWidget extends connect(store)(LitElement) {

  static get styles() {
    return css`
      .widget-type {
        overflow: auto;
        width: 100%;
        height: calc(100% - 38px);
      }

      .widget-type:not([data-is]) > * {
        overflow: auto;
        width: 100%;
        height: calc(100% - 38px);
      }
    `;
  }

  static get properties() { 
    return {
      //categories: { type: Object }      
    };
  }

  constructor() {
    super();
    this.ntRoot = null;
    this.widgetType = null;
    this.properties = {};
    this.prevProperties = {};
    this.propertiesTag = null;
    this.propertiesElement = null;
  }

  getPropertiesDefaults(widgetType) {
    let widgetConfig = dashboard.store.getState().widgets.registered[widgetType];

    if (widgetConfig.isCustomElement) {
      return ObservableSlim.create({...widgetConfig.properties.defaults}, false, (changes) => {
        const widgetType = this.shadowRoot.getElementById('widgetType');
        const widget = $(widgetType).find(this.widgetType)[0];
        widget.requestUpdate('widgetProps', this.prevProperties);
        this.prevProperties = { ...this.properties };
        
      });
    }
    return ObservableSlim.create({...widgetConfig.properties.defaults}, false, (changes) => {
      const widgetType = this.shadowRoot.getElementById('widgetType');
      widgetType._tag.trigger('propertiesUpdate');
      widgetType._tag.update();
    });
  }

  setupPropertiesModal(widgetType) {
    
    this.propertiesTag = this.getPropertiesTag(widgetType);

    if (this.propertiesTag) {
      const widgetConfig = dashboard.store.getState().widgets.registered[widgetType];
      if (widgetConfig.properties.isCustomElement) {
        const element = document.createElement(this.propertiesTag);
        element.widgetProps = this.properties;
        this.propertiesElement.innerHTML = '';
        this.propertiesElement.appendChild(element);
      }
      else {
        riot.mount(this.propertiesElement, this.propertiesTag, {
          properties: this.properties
        });
      }
    }
  }

  getConfig() {
    return dashboard.store.getState().widgets.registered[this.widgetType];
  }

  getPropertiesTag(widgetType) {
    let widgetConfig = dashboard.store.getState().widgets.registered[widgetType];
    return widgetConfig.properties.tag;
  }

  hasProperties() {
    return !!this.propertiesTag;
  }

  openPropertiesModal() {
    const propertiesModal = this.shadowRoot.getElementById('propertiesModal');
    propertiesModal.open();

    const widgetConfig = dashboard.store.getState().widgets.registered[this.widgetType];
    if (widgetConfig.properties.isCustomElement) {
      const propsElement = $(this.propertiesElement).find(widgetConfig.properties.tag)[0];
      propsElement.requestUpdate();
    }
    else {
      this.propertiesElement._tag.update();
    }
  }

  getTitle() {
    return $(this).closest('li').find('.widget-title').val();
  }

  setTitle(title) {
    $(this).closest('li').find('.widget-title').val(title || this.ntRoot || '');
  }

  setProperties(properties) {
    forEach(properties, (value, key) => {
      this.properties[key] = value;
    });
  }

  onResize() {
    const { isCustomElement } = this.getConfig();
    const widgetType = this.shadowRoot.getElementById('widgetType');
    if (isCustomElement) {
      const widget = $(widgetType).find(this.widgetType)[0];
      if (widget) {
        widget.resized();
        widget.requestUpdate();
      }
    } 
    else {
      widgetType._tag.trigger('resize');
      widgetType._tag.update();
    }
  }

  isAcceptedType(ntTypes, widgetType = this.widgetType) {
    let widgetConfig = dashboard.store.getState().widgets.registered[widgetType];

    if (!widgetConfig) {
      return false;
    }

    for (let i = 0; i < ntTypes.length; i++) {
      if (widgetConfig.acceptedTypes.indexOf(ntTypes[i]) > -1) {
        return true;
      }
    }

    return false;
  }

  // If ignoreType is true, set even if the type is not one of the accepted types.
  // This is useful for saved widgets that have ntRoots that haven't been set yet.
  setNtRoot(root, ignoreType) {
    let ntTypes = getTypes(root);
    
    if (ignoreType || this.isAcceptedType(ntTypes)) {
      this.ntRoot = root;
      this.manuallyUpdate();
      return true;
    }

    return false;
  }

  async setWidgetType(type) {

    await this.updateComplete;
    let ntTypes = getTypes(this.ntRoot);

    if (ntTypes.length === 0 || this.isAcceptedType(ntTypes, type)) {
      this.widgetType = type;
      this.properties = this.getPropertiesDefaults(type);
      this.prevProperties = { ...this.properties };

      if (customElements.get(type)) {
        const widgetElement = document.createElement(type);
        widgetElement.table = {};
        widgetElement.widgetProps = this.properties;
        const widgetType = this.shadowRoot.getElementById('widgetType');
        widgetType.innerHTML = '';
        widgetType.appendChild(widgetElement);
      } 
      else {
        const widgetType = this.shadowRoot.getElementById('widgetType');
        riot.mount(widgetType, type, {
          table: {},
          properties: this.properties
        });
      }
      
      this.setupPropertiesModal(type);

      this.manuallyUpdate();
    }
  }

  async manuallyUpdate() {
    this.stateChanged(dashboard.store.getState());
    this.setTitle(this.getTitle());
    this.requestUpdate();
    await this.updateComplete;

    const { isCustomElement } = this.getConfig();
    const widgetType = this.shadowRoot.getElementById('widgetType');

    if (isCustomElement) {
      const widget = $(widgetType).find(this.widgetType)[0];
      widget.requestUpdate();
    }
    else {
      widgetType._tag.update();
    }
  }
 
  stateChanged(state) {
    if (!this.ntRoot) {
      return;
    }

    const ntTypes = getTypes(this.ntRoot);
    const isAcceptedType = this.isAcceptedType(ntTypes);

    let ntValue = isAcceptedType ? getSubtable(this.ntRoot) : {};
    
    const { isCustomElement } = this.getConfig() || {};
    const widgetType = this.shadowRoot.getElementById('widgetType');
    

    if (isCustomElement) {
      const widget = $(widgetType).find(this.widgetType)[0];
      if (widget) {
        const prevTable = widget.table;
        const prevNtRoot = this.ntRoot;
        widget.table = ntValue;
        widget.ntRoot = this.ntRoot;
        widget.requestUpdate('table', prevTable);
        widget.requestUpdate('ntRoot', prevNtRoot);
      }
    }
    else if (widgetType && '_tag' in widgetType) {
      widgetType._tag.opts.table = ntValue;
      widgetType._tag.opts.ntRoot = this.ntRoot;
      widgetType._tag.update();
    }

    this.ntValue = ntValue;
  }

  firstUpdated() {
    this.propertiesElement = this.shadowRoot.getElementById('widgetProperties');
  }

  render() {
    return html`
      ${includeStyles()}
      <div class="widget-type" id="widgetType" .tables="${this.ntValue}"></div>
      
      <dashboard-modal id="propertiesModal" title="Properties">
        <div class="modal-body">
          <div id="widgetProperties" class="widget-properties"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </dashboard-modal>
    `;
  }
}

customElements.define('dashboard-widget', DashboardWidget);