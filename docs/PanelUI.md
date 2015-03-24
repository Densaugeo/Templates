# PanelUI.js

Dependencies: `EventEmitter.js` , `Draggabilliy.js` 

#### Methods

`HTMLElement` **forgeElement**`(String tagName, Object properties, Array children)` -- Daisy-chainable element maker

---

## PanelUI.Sidebar

Inherits: `EventEmitter`

Makes a sidebar. Buttons added to the sidebar can be triggered by clicks or keyboard shortcuts 1-9, 0, -, and =

Icons come from Font Awesome and are specified in the faClass option

```
var sidebar = new PanelUI.Sidebar();
sidebar.addButton({buttonName: 'do_stuff', faClass: 'fa-question', title: 'Tooltip text'});
sidebar.on('do_stuff', function() {console.log('Doing stuff')});
sidebar.on('trigger', function(e) {console.log(e.buttonName === 'do_stuff')});
```

#### Properties

`Array` **buttonIndicesToKeyChars** -- Look up a button index and get a char for its key

`HTMLCollection` **children** -- Alias for domElement.children

`HTMLElement` **domElement** -- div tag that holds all of the Panel's HTML elements

`Object` **keyCodesToButtonIndices** -- Look up a keyCode and get a button index

#### Methods

`undefined` **addButton**`(Object {String faClass, String title, String buttonName})` -- Add a button. Support font-awesome icon names

#### Events

**[buttonName]** `{}` -- Fired when a button is triggered. Event name is the buttonName defined when the corresponding button was added

**trigger** `{String buttonName}` -- Fired when a button is triggered

---

## PanelUI.Panel

Inherits: `EventEmitter`

Makes a panel. Includes draggability and close button

```
var panel = new PanelUI.Panel({id: 'css_id', heading: 'Your heading here', closeButton: true, accessKey: 'a'});
panel.open();
```

#### Options

`String` **accessKey** -- Browser accesskey

`Boolean` **closeButton** -- Show a close button?

`String` **heading** -- Heading text

`String` **id** -- CSS ID

#### Properties

`HTMLElement` **closeButton** -- Reference to the close button (may not exist, depending on options)

`HTMLElement` **domElement** -- div tag that holds all of the Panel's HTML elements

`Draggabilly` **draggie** -- Attachment of Draggabilly library for drag-and-drop positioning

`Object` **keyCuts** -- Key-value store of keyboard shortcuts. Keys are .keyCode numbers, values are HTMLElement references

#### Methods

`undefined` proto **close**`()` -- Removes Panel's domElement from the document

`Boolean` proto **isOpen**`()` -- Returns whether panel is currently open (attached to document)

`undefined` proto **open**`()` -- Adds Panel's domElement to the document

`undefined` proto **toggleOpen**`()` -- Toggle .domElement on and off of document.body

#### Events

**close** `{}` -- Fired on panel close

