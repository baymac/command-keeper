// Import GLib module (library) for file utilities
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

/*
GNOME Data Access (GDA) is library whose purpose is to provide universal access to different kinds and types of data sources
from traditional relational database systems, to any imaginable kind of data source such as a mail server, a LDAP directory, etc
*/
const Gda = imports.gi.Gda;

const Mainloop   = imports.mainloop;

/* Import St because is the library that allow you to create UI elements */
const St = imports.gi.St;

/* Import Clutter because is the library that allow you to layout UI elements */
const Clutter = imports.gi.Clutter;

/*
Import Main because is the instance of the class that have all the UI elements
and we have to add to the Main instance our UI elements
*/
const Main = imports.ui.main;

/* Import tweener to do the animations of the UI elements */
const Tweener = imports.ui.tweener;

/*
Import PanelMenu and PopupMenu 
See more info about these objects in REFERENCE.md
*/
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Clipboard = St.Clipboard.get_default();
const CLIPBOARD_TYPE = St.ClipboardType.CLIPBOARD;

let MAX_ENTRY_LENGTH = 40;

/*
Import Lang because we will write code in a Object Oriented Manner
*/
const Lang = imports.lang;

/*
In here we are creating a new Class named `Command Keeper`
You can see that:
	`Name:` is the same as the name class
	`Extends:` is the class you are extending from
	`_init: function(){}` is the constructor
	-destroy: function{}` is the destructor
	and you can add more functions to this class if you want to
*/
const CommandKeeper = new Lang.Class({
    Name: 'CommandKeeper',
    Extends: PanelMenu.Button,

    // Constructor
    _init: function() {
        /* 
		This is calling the parent constructor
		1 is the menu alignment (1 is left, 0 is right, 0.5 is centered)
		`CommandKeeper` is the name
		true if you want to create a menu automatically, otherwise false
		*/
        this.parent(1, 'CommandKeeper', false);

        this.text = null;

        // We are creating a box layout with shell toolkit
        let box = new St.BoxLayout({ style_class: 'panel-status-menu-box'});
    
        /*
		A new icon 'Terminal'
		All icons are found in `/usr/share/icons/theme-being-used`
		In other tutorials we will teach you how to use your own icons

		The class 'system-status-icon` is very useful, remove it and restart the shell then you will see why it is useful here
        */
        this.icon = new St.Icon({ 
                icon_name: 'go-previous-rtl-symbolic'
            }
        );

        // A label expanded and center aligned in the y-axis
        this.toplabel = new St.Label(
            { 
                text: 'Commands',
                y_expand: true,
                y_align: Clutter.ActorAlign.CENTER      
            }
        );
        
        // We add the icon and the label to the box
        box.add(this.icon);
        box.add(this.toplabel);
        // box.add(PopupMenu.arrowIcon(St.Side.BOTTOM));

        // We add the box to the button
		// It will be showed in the Top Panel
        this.actor.add_child(box);
        
        this._setupDb();
        
        this._buildMenu();
    },

    destroy: function() {
        /*
        This call the parent destroy function
        */
        this.parent();
    },

    _dropTable: function() {
        this.connection.execute_non_select_command("drop table commands");
    },

    _setupDb: function() {
        this.connection = new Gda.Connection (
            {
                provider: Gda.Config.get_provider("SQLite"),
                cnc_string: "DB_DIR=" + GLib.get_home_dir() + ";DB_NAME=commands_db"
            }
        );
        this.connection.open();
        try {
            var cmd = this.connection.execute_select_command ("select * from commands");
        } catch (e) {
            this.connection.execute_non_select_command ("create table commands (id integer primary key autoincrement, name varchar(100))");
        }
    },

    _buildMenu: function () {
        let that = this;
       
        /* This create the search entry, which is add to a menuItem.
        The searchEntry is connected to the function for research.
        The menu itself is connected to some shitty hack in order to
        grab the focus of the keyboard. */
        that._entryItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });

        that.searchEntry = new St.Entry({
            name: 'searchEntry',
            style_class: 'search-entry',
            can_focus: true,
            hint_text: _('Type here to add/search..'),
            track_hover: true
        });

        that.searchEntry.get_clutter_text().connect(
            'text-changed',
            Lang.bind(that, that._onSearchTextChanged)
        );

        that._entryItem.actor.add(that.searchEntry, { expand: true });

        that.menu.addMenuItem(that._entryItem);

        // highlight the search box upon openning command menu
        that.menu.connect('open-state-changed', Lang.bind(this, function(self, open){
            let a = Mainloop.timeout_add(50, Lang.bind(this, function() {
                if (open) {
                    that.searchEntry.set_text('');
                    global.stage.set_key_focus(that.searchEntry);
                }
                Mainloop.source_remove(a);
            }));
        }));

        // Add button
        let iconAdd = new St.Icon({
            icon_name: 'list-add-symbolic',
            style_class: 'system-status-icon add-color'
        });

        let addBtn = new St.Button({
            style_class: 'ci-action-btn',
            x_fill: true,
            can_focus: true,
            child: iconAdd
        });

        addBtn.set_x_align(Clutter.ActorAlign.END);
        addBtn.set_x_expand(true);
        addBtn.set_y_expand(true);

        that._entryItem.actor.add_child(addBtn);
        that._entryItem.addBtn = addBtn;

        addBtn.connect(
            'button-press-event', () => {
                that._insertClicked();
            }
        );

        // History
        that.historySection = new PopupMenu.PopupMenuSection();

        that.scrollViewMenuSection =  new PopupMenu.PopupMenuSection();

        let historyScrollView = new St.ScrollView({
            style_class: 'ci-history-menu-section',
            overlay_scrollbars: true
        });

        historyScrollView.add_actor(that.historySection.actor);

        that.scrollViewMenuSection.actor.add_actor(historyScrollView);

        that.menu.addMenuItem(that.scrollViewMenuSection);

        let cmd = this.connection.execute_select_command ("select * from commands order by 2");
        let iter = cmd.create_iter();

        let commands = '';
        let ids = '';

        while (iter.move_next()) {
            ids += Gda.value_stringify(iter.get_value_at(0)) + '\n';
            commands += Gda.value_stringify(iter.get_value_at(1)) + '\n';
        }

        let idsArray= (ids.split('\n'));


        // getting the max id to update the id of the menuitem at the time of creation 
        this.lastId = Math.max(...idsArray);

        log(idsArray);

        let commandsArray = commands.split('\n');
        
        log(commandsArray.length);

        // reducing the loop by 1 because an extra line is added due to concatenation
        for(var i = 0; i < commandsArray.length-1; i++) {
            that._addEntry(commandsArray[i], idsArray[i]);
        }
        
    },

    _getAllIMenuItems: function () {
        return this.historySection._getMenuItems();
    },

    _onSearchTextChanged: function() {
        let final_text = this.searchEntry.get_text();

        if(final_text === '') {
            this._getAllIMenuItems().forEach(function(mItem){
                mItem.actor.visible = true;
            });
        }
        else {
            this._getAllIMenuItems().forEach(function(mItem){
                let text = mItem.clipContents;
                let isMatching = text.indexOf(final_text) >= 0;
                mItem.actor.visible = isMatching
            });
        }
    },

    _truncate: function(string, length) {
        let shortened = string.replace(/\s+/g, ' ');

        if (shortened.length > length)
            shortened = shortened.substring(0,length-1) + '...';

        return shortened;
    },

    _setEntryLabel: function (menuItem) {
        let buffer = menuItem.clipContents;
        menuItem.label.set_text(this._truncate(buffer, MAX_ENTRY_LENGTH));
    },

    _addEntry: function(command, id) {

        if (command === '') {
            return;
        }
        let menuItem = new PopupMenu.PopupMenuItem('');
        
        menuItem.menu = this.menu;
        menuItem.id = id;
        menuItem.clipContents = command;

        menuItem.buttonPressId = menuItem.connect('activate',
            Lang.bind(menuItem, this._onMenuItemSelectedAndMenuClose));
        
        this._setEntryLabel(menuItem);

        this.historySection.addMenuItem(menuItem, 0);

        let icoDel = new St.Icon({
            icon_name: 'edit-delete-symbolic', //'mail-attachment-symbolic',
            style_class: 'system-status-icon'
        });

        let delBtn = new St.Button({
            style_class: 'ci-action-btn del-color',
            x_fill: true,
            can_focus: true,
            child: icoDel
        });

        delBtn.set_x_align(Clutter.ActorAlign.END);
        delBtn.set_x_expand(true);
        delBtn.set_y_expand(true);

        menuItem.actor.add_child(delBtn);
        menuItem.delBtn = delBtn;

        menuItem.deletePressId = delBtn.connect('button-press-event', 
            Lang.bind(this, function () {
                this._removeEntry(menuItem, 'delete');
            })
        );
    },

    _removeEntry: function(menuItem, event) {
        this.connection.execute_non_select_command("delete from commands where id = " + menuItem.id);
        menuItem.destroy();
    },

    _onMenuItemSelectedAndMenuClose: function () {
        var that = this;

        let clipContents = that.clipContents;

        Clipboard.set_text(CLIPBOARD_TYPE, clipContents);
        
        that.menu.close();
    },

    _insertClicked: function() {

        let final_text = this.searchEntry.get_text();

        if(final_text === '') {
            return;
        }
        this.lastId += 1;

        this._addEntry(final_text, this.lastId);

        var b = new Gda.SqlBuilder({
                stmt_type: Gda.SqlStatementType.INSERT
            }
        );

        b.set_table("commands");
        b.add_field_value_as_gvalue("name", final_text);
        var stmt = b.get_statement();
        this.connection.statement_execute_non_select(stmt, null);

        this.searchEntry.set_text('');
    },
});


/* Global variables for use as button to click */
let commandKeeper;

/*
This is the init function, here we have to put our code to initialize our extension.
we have to be careful with init(), enable() and disable() and do the right things here.
In this case we will do nothing
*/
function init() {
    
}

/*
We have to write here our main extension code and the things that actually make works the extension(Add ui elements, signals, etc).
*/
function enable() {
    /* Create a new object button from class CommandKeeper */
	commandKeeper = new CommandKeeper();
    
    /* 
	In here we are adding the button in the status area
	- `CommandKeeper` is tha role, must be unique. You can access it from the Looking Glass  in 'Main.panel.statusArea.CommandKeeper`
	- button is and instance of panelMenu.Button
	- 0 is the position
	- `right` is the box where we want our button to be displayed (left/center/right)
	 */
	Main.panel.addToStatusArea('CommandKeeper', commandKeeper, 1);
}

/*
We have to delete all conections and things from our extensions, to let the system how it is before our extension. So
We have to unconnect the signals we connect, we have to delete all UI elements we created, etc.
*/
function disable() {
	/* 
	We call the destroy function inside the object button
	therefore the button is remove from the panel
	*/
	button.destroy();	
}
