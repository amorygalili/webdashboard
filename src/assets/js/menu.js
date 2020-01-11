const { remote } = require('electron');
const { Menu, MenuItem, app } = remote;

let menu = Menu.getApplicationMenu();

const newMenu = new Menu();

let fileMenuItem = new MenuItem({ 
  label: 'File', 
  submenu: [
    { 
      label: 'Save', 
      click() { 
        dashboard.events.trigger('fileMenuSave');
      } 
    },
    { 
      label: 'Load', 
      click() { 
        dashboard.events.trigger('fileMenuLoad');
      } 
    },
    { 
      label: 'NetworkTables Settings', 
      click() { 
        dashboard.events.trigger('fileMenuNtSettings');
      } 
    },
    { type: 'separator' },
    {
      label: 'Close',
      click() {
          app.quit();
      }
    }
  ] 
});

newMenu.append(menu.items[0]);
newMenu.append(fileMenuItem);
newMenu.append(menu.items[2]);
newMenu.append(menu.items[3]);
newMenu.append(menu.items[4]);
newMenu.append(menu.items[5]);


Menu.setApplicationMenu(newMenu); 

