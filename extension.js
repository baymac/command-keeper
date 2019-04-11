// Import GLib module (library) for file utilities
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

/*
GNOME Data Access (GDA) is library whose purpose is to provide universal access to different kinds and types of data sources
from traditional relational database systems, to any imaginable kind of data source such as a mail server, a LDAP directory, etc
*/
const Gda = imports.gi.Gda;


let loop = GLib.MainLoop.new(null, false);

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

        this.commands = '';

        // We are creating a box layout with shell toolkit
        let box = new St.BoxLayout({ style_class: 'panel-status-menu-box'});
    
        /*
		A new icon 'Terminal'
		All icons are found in `/usr/share/icons/theme-being-used`
		In other tutorials we will teach you how to use your own icons

		The class 'system-status-icon` is very useful, remove it and restart the shell then you will see why it is useful here
        */
        this.icon = new St.Icon(
            { 
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

    _setupDb: function() {
        this.connection = new Gda.Connection (
            {
                provider: Gda.Config.get_provider("SQLite"),
                cnc_string: "DB_DIR=" + GLib.get_home_dir() + ";DB_NAME=commands_db"
            }
        );
        this.connection.open ();
        try {
            var cmd = this.connection.execute_select_command ("select * from commands");
        } catch (e) {
            this.connection.execute_non_select_command ("create table commands (id integer, name varchar(100 ))");
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

        that.menu.addMenuItem(that._entryItem);

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

        // this.commands += String(GLib.file_get_contents(
        //     '/home/parichay/.local/share/gnome-shell/extensions/Command_Keeper@Baymax/commands.txt',
        // )[1]);

        var cmd = this.connection.execute_select_command ("select * from commands order by 1, 2");
        var iter = cmd.create_iter();

        while (iter.move_next()) {
            var command_field = Gda.value_stringify(iter.get_value_at(1));
            this.commands += command_field + '\n';
        }

        let commandsArray = this.commands.split( '\n' );

        commandsArray.forEach((command) => {
            if ( typeof command === 'string') {
                that._addEntry(command);
            }
            // TODO return error for incorrect characters
        })        
    },
    _getAllIMenuItems: function (text) {
        return this.historySection._getMenuItems();
    },

    _onSearchTextChanged: function() {
        let final_text = this.searchEntry.get_text().toLowerCase();

        if(final_text === '') {
            this._getAllIMenuItems().forEach(function(mItem){
                mItem.actor.visible = true;
            });
        }
        else {
            this._getAllIMenuItems().forEach(function(mItem){
                let text = mItem.clipContents.toLowerCase();
                let isMatching = text.indexOf(final_text) >= 0;
                mItem.actor.visible = isMatching
            });
        }
    },

    _addEntry: function(command) {

        let menuItem = new PopupMenu.PopupMenuItem('');
        
        menuItem.menu = this.menu;

        menuItem.clipContents = command;

        menuItem.buttonPressId = menuItem.connect('activate',
            Lang.bind(menuItem, this._onMenuItemSelectedAndMenuClose));
        
        menuItem.label.set_text(command);

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

        menuItem.deletePressId = delBtn.connect('button-press-event', () => {
                this._showHello();
            }
        );

    },

    _onMenuItemSelectedAndMenuClose: function () {
        var that = this;

        let clipContents = that.clipContents;
        log(clipContents);

        Clipboard.set_text(CLIPBOARD_TYPE, clipContents);
        
        that.menu.close();
    },

    _insertClicked: function() {

        let final_text = this.searchEntry.get_text().toLowerCase();

        if(final_text === '') {
            return;
        }

        this.commands += final_text + '\n';

        this._addEntry(final_text);

        var b = new Gda.SqlBuilder({
                stmt_type: Gda.SqlStatementType.INSERT
            }
        );
        b.set_table("commands");
        b.add_field_value_as_gvalue("id", Math.floor(Math.random()));
        b.add_field_value_as_gvalue("name", final_text);
        var stmt = b.get_statement();
        this.connection.statement_execute_non_select(stmt, null);

        log(this.commands);
        this.searchEntry.set_text('');
    },

    _hideHello: function() {
        Main.uiGroup.remove_actor(this.text);
    },
    
    _showHello: function() {
        /*
        We create a new UI element, using ST library, that allows us
        to create UI elements of gnome-shell.
        */
    
        
        this.text = new St.Label({ style_class: 'helloworld-label', text: 'hello, world'});
        Main.uiGroup.add_actor(this.text);
        
        this.text.opacity = 255;
    
        /*
        We have to choose the monitor we want to display the hello world label. Since in gnome-shell
        always has a primary monitor, we use it(the main monitor)
        */
        let monitor = Main.layoutManager.primaryMonitor;
    
        /*
        We change the position of the text to the center of the monitor.
        */
        this.text.set_position(monitor.x + Math.floor(monitor.width / 2 - this.text.width / 2),
                            monitor.y + Math.floor(monitor.height / 2 - this.text.height / 2));
    
        /*
        And using tweener for the animations, we indicate to tweener that we want
        to go to opacity 0%, in 2 seconds, with the type of transition easeOutQuad, and,
        when this animation has completed, we execute our function _hideHello.
        */
        Tweener.addTween(this.text, { 
                opacity: 0,
                time: 2,
                transition: 'easeOutQuad',
                onComplete: this._hideHello 
            }
        );
    }
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
