import './subtable.tag';
import './networktables.scss';
import _ from 'lodash';
import fileImage from 'open-iconic/png/file-8x.png';
import { getTypes, getDefaultWidgetConfig } from 'assets/js/networktables';

<networktables>  
  <div class="table">
    <div class="table-row header">
      <span class="row-item key">Key</span>
      <span class="row-item value">Value</span>
    </div>
    <subtable nt-key="/" key-label="root" values={opts.values} />
  </table>


  <script>

    let dragImg = document.createElement("img");
    dragImg.src = fileImage;

    this.getWidgets = (x, y) => {
      let widgetTabsElement = document.getElementsByTagName('widget-tabs')[0]; 
      let widgetTabs = widgetTabsElement._tag;
      let widgets = widgetTabs.getActiveWidgetTab();
      return widgets.getWidgets(x, y);
    };

    this.addWidget = (x, y, config) => {
      let widgetTabsElement = document.getElementsByTagName('widget-tabs')[0]; 
      let widgetTabs = widgetTabsElement._tag;
      let widgets = widgetTabs.getActiveWidgetTab();
      return widgets.addWidget(x, y, config);
    }

    this.on('mount', () => {
      $(this.root).on('dragstart', '.table-row:not(.header)', (ev) => {
        ev.originalEvent.dataTransfer.setData("text/plain", ev.target.id);
        ev.originalEvent.dataTransfer.setDragImage(dragImg, 0, 0);
      });

      $(this.root).on('dragend', '.table-row:not(.header)', (ev) => {
        const $ntKey = $(ev.target).closest('[data-nt-key], [nt-key]');
        const isSubtable = $ntKey[0].tagName === 'SUBTABLE';
        const ntKey = $ntKey.attr('data-nt-key') || $ntKey.attr('nt-key');
        const ntTypes = getTypes(ntKey);
        const ntType = _.first(ntTypes);

        let dragEndPosition = this.getDragEndPosition(ev);

        let widgets = this.getWidgets(dragEndPosition.x, dragEndPosition.y);

        widgets.forEach(widget => {
          
          if (widget.setNtRoot(ntKey)) {
            dashboard.toastr.success(`Successfully added source '${ntKey}'`);
          }
          else {
            const widgetConfig = widget.getConfig();
            dashboard.toastr.error(`Widget of type '${widgetConfig.label}' doesn't accept type 
                                    '${ntType}'. Accepted types are '${widgetConfig.acceptedTypes.join(', ')}'`);
          }
        });

        // Send notification if setting widget failed
        if (widgets.length === 0) {

          const widgetConfig = getDefaultWidgetConfig(ntType);

          if (widgetConfig) {
            const widget = this.addWidget(dragEndPosition.x, dragEndPosition.y, {
              type: widgetConfig.type,
              minX: widgetConfig.minX,
              minY: widgetConfig.minY
            });

            widget.setNtRoot(ntKey);
            dashboard.toastr.success(`Successfully added source '${ntKey}' to widget of type '${widgetConfig.label}'.`);
          }
          else {
            dashboard.toastr.error(`Failed to add source '${ntKey}'. No widget that accepts type '${ntType}' could be found.`);
          }
        }

        
      });
    });


    this.getDragEndPosition = (ev) => {

      if (navigator.userAgent.indexOf("Firefox") != -1) {
        const scrollLeft = $(window).scrollLeft();
        const scrollTop = $(window).scrollTop();

        return {
          x: ev.originalEvent.screenX - scrollLeft - window.screenX,
          y: ev.originalEvent.screenY - scrollTop - window.screenY
        }
      }
      else {
        return {
          x: ev.originalEvent.clientX,
          y: ev.originalEvent.clientY
        }
      }

    };



    const mapStateToOpts = (state) => {
      const values = state.networktables.values;
      return {
        values
      };
    };

    this.reduxConnect(mapStateToOpts, null);


  </script>


</networktables>