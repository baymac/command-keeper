/* Import St because is the library that allow you to create UI elements */
const St = imports.gi.St;

/* Import Clutter because is the library that allow you to layout UI elements */
const Clutter = imports.gi.Clutter;

/*
Import Main because is the instance of the class that have all the UI elements
and we have to add to the Main instance our UI elements
*/
const Main = imports.ui.main;

/*
Import PanelMenu and PopupMenu 
See more info about these objects in REFERENCE.md
*/
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;


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

        // We are creating a box layout with shell toolkit
        let box = new St.BoxLayout();

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

        // let popupMenuExpander = new PopupMenu.PopupSubMenuMenuItem('Search');
        // let submenu = new PopupMenu.PopupMenuItem('Type here..');
        // popupMenuExpander.menu.addMenuItem(submenu);
        // popupMenuExpander.menu.box.add(new St.Label({text: 'Search your command'}));

        // // popupMenuExpander.menu.box.style_class = 'PopupSubMenuMenuItemStyle';

        // this.menu.addMenuItem(popupMenuExpander);
        // // this.menu.connect('open-state-changed', Lang.bind(this, function(){
		// // 	popupMenuExpander.setSubmenuShown(false);
        // // }));
        
        this._buildMenu();
    },

    destroy: function() {
        /*
        This call the parent destroy function
        */
        this.parent();
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

        that._entryItem.actor.add(that.searchEntry, {expand: true });

        that.menu.addMenuItem(that._entryItem);

    },

});

/* Global variables for use as button to click */
let button;

/*
This is the init function, here we have to put our code to initialize our extension.
we have to be careful with init(), enable() and disable() and do the right things here.
In this case we will do nothing
*/
function init() {}

/*
We have to write here our main extension code and the things that actually make works the extension(Add ui elements, signals, etc).
*/
function enable() {
    /* Create a new object button from class CommandKeeper */
	button = new CommandKeeper();
    
    /* 
	In here we are adding the button in the status area
	- `CommandKeeper` is tha role, must be unique. You can access it from the Looking Glass  in 'Main.panel.statusArea.CommandKeeper`
	- button is and instance of panelMenu.Button
	- 0 is the position
	- `right` is the box where we want our button to be displayed (left/center/right)
	 */
	Main.panel.addToStatusArea('CommandKeeper', button, 0, 'right');
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