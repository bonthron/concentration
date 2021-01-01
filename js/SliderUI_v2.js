

// --------------------------------------------------------------------------------- SliderUI2
var SliderUI2 = {
    name: "SliderUI2",
    initialMouseX: undefined,
    initialMouseY: undefined,
    startX: undefined,
    startY: undefined,
    draggingObject: undefined,
    allSliders: []
}

// --------------------------------------------------------------------------------- newSlider
SliderUI2.newSlider = function (id, width, min, max) {

    var start = arguments[4] ? arguments[4] : 50;  // optional 

    var div = document.getElementById(id);
    div.className = "SliderUI2";
    div.style.width = width + "px";
    
    var track = document.createElement('div');
    track.className = "SliderUI2track";
    track.style.width = width + "px";


    var trackEndCap1 = document.createElement('div');
    trackEndCap1.className = "colorEndCap";

    var trackEndCap2 = document.createElement('div');
    trackEndCap2.className = "greyEndCap";

    var thumb = document.createElement('div');
    thumb.id = id + "_sliderThumb";
    thumb.sliderId = id;
    thumb.className = "sliderThumb enabled";
    thumb.style.left = 0 + "px";
    thumb.style.zIndex = 1;
    thumb.x = width;
    thumb.onmousedown  = this.startDrag;
    thumb.ontouchstart = this.startDrag;

    var thumbDisplay = document.createElement('div');
    thumbDisplay.id = id + "_sliderThumbDisplay";
    thumbDisplay.sliderId = id;
    thumbDisplay.className = "sliderThumbDisplay";
    thumbDisplay.style.left = 0 + "px";

    var color = document.createElement('div');
    color.id = id + "_sliderColor";
    color.sliderId = id;
    color.className = "sliderColor";
    color.style.left = "0px";
    color.style.width = "0px";
    color.x = 0;
    color.w = 0;

    div.appendChild(thumbDisplay);
    div.appendChild(track);
    track.appendChild(trackEndCap1);
    track.appendChild(color);
    track.appendChild(thumb);
    track.appendChild(trackEndCap2);

    var obj = {
        id: id,
        min: min,
        max: max,
        width: width,
        div: div,
        thumb: thumb,
        thumbDisplay: thumbDisplay,
        color: color,
        pixelUnit: ((max - min)/width),
        perc: 0,
        events: [],
        topZ: 1,
        enabled:true
    }

    this.allSliders[id] = obj;
    this.setPercent(id, start);
    
};

// --------------------------------------------------------------------------------- startDrag
// this == element
SliderUI2.startDrag = function (e) {

    var s = SliderUI2.allSliders[this.sliderId];
    if(!s.enabled){ return; }

    SliderUI2.getX(this);

    this.className += " thumbhover"; // add hover css
    s.topZ++;                        // increase zindex
    this.style.zIndex = s.topZ;

    var evt = e || window.event;
    SliderUI2.initialMouseX = evt.clientX;
    if (document.all == undefined) {
        if (evt.type == 'touchstart') {
            SliderUI2.initialMouseX = evt.touches[0].pageX;
        }
    }

    document.onmousemove = SliderUI2.drag;
    document.onmouseup   = SliderUI2.releaseObj;
    document.ontouchmove = SliderUI2.drag;
    document.ontouchend  = SliderUI2.releaseObj;
    document.body.style.cursor = "pointer";

    // click event
    if (s.events["click"]) { s.events["click"].call(window, s); };

    return false;
};

// --------------------------------------------------------------------------------- drag
// this == document
SliderUI2.drag = function (e) {
    var evt = e || window.event;
    var position = evt.clientX;

    if (document.all == undefined) {
        if (e.type == 'touchmove') {
            position = e.touches[0].pageX;
        }
    }
    var dX = position - SliderUI2.initialMouseX;

    SliderUI2.setPosition(dX);

    return false;
};

// --------------------------------------------------------------------------------- releaseObj
// this == document
SliderUI2.releaseObj = function () {

    document.onmousemove = null;
    document.onmouseup = null;
    document.ontouchmove = null;
    document.ontouchend = null;
    document.body.style.cursor = "auto";

    var s = SliderUI2.allSliders[SliderUI2.draggingObject.sliderId];
    var dragObj = SliderUI2.draggingObject;

    // release event
    if (s.events["release"]) { s.events["release"].call(window, s); };

    dragObj.className = dragObj.className.replace(/thumbhover/, '');
    SliderUI2.draggingObject = null;
};

// --------------------------------------------------------------------------------- getX
SliderUI2.getX = function (o) {

    if (this.draggingObject) { this.releaseObj(); };

    this.draggingObject = o;
    this.startX = o.offsetLeft + 7; // add 7: the thumb css has a negative offset of 7px
};

// --------------------------------------------------------------------------------- setPosition
SliderUI2.setPosition = function (dX) {

    var dragObj = this.draggingObject;
    var sliderObj = this.allSliders[dragObj.sliderId];

    var thumb = sliderObj.thumb;
    var color = sliderObj.color;
    var display = sliderObj.thumbDisplay;
    var colorWidth = 0;

    var x = this.startX + dX;

    if (x > sliderObj.width) { x = sliderObj.width; }
    if (x < 0) { x = 0; }
    colorWidth = Math.round(thumb.x);

    dragObj.x = x;
    dragObj.style.left = x + 'px';

    display.x = x;
    display.style.left = x + 'px';

    color.x = 0;
    color.style.left = '0px';
    color.width = colorWidth;
    color.style.width = colorWidth + 'px';
    sliderObj.percent = (thumb.x * sliderObj.pixelUnit)/(sliderObj.max - sliderObj.min);
    display.innerHTML = sliderObj.min + Math.round(sliderObj.percent * (sliderObj.max - sliderObj.min));

    // update event
    if (sliderObj.events["change"]) { sliderObj.events["change"].call(window, sliderObj); };
};

// --------------------------------------------------------------------------------- registerEvent
SliderUI2.registerEvent = function (sliderId, eventName, func) {

    var s = this.allSliders[sliderId];
    if (s) { s.events[eventName] = func; };
};

// --------------------------------------------------------------------------------- getData
SliderUI2.getData = function (sliderId) {

    var sliderObj = this.allSliders[sliderId];
    if (!sliderObj) { console.log("SliderUI2 can't find slider: " + sliderId); return; }

    var Percent = (sliderObj.thumb.x * sliderObj.pixelUnit)/(sliderObj.max - sliderObj.min);
    var Val = sliderObj.min + Math.round(sliderObj.percent * (sliderObj.max - sliderObj.min));

    return [Percent, Val]
};

// --------------------------------------------------------------------------------- setPercent
SliderUI2.setPercent = function (sliderId, perc) {

    var sliderObj = this.allSliders[sliderId];
    if (!sliderObj) { console.log("SliderUI2 can't find slider: " + sliderId); return; }

    var val = sliderObj.min + Math.round(perc/100 * (sliderObj.max - sliderObj.min));
    sliderObj.percent = perc/100;

    var colorWidth = val;

    sliderObj.thumb.x = val;
    sliderObj.thumbDisplay.x = val;
    sliderObj.thumbDisplay.innerHTML = sliderObj.min + Math.round((perc / 100) * (sliderObj.max - sliderObj.min));

    sliderObj.thumb.style.left = val + 'px';
    sliderObj.thumbDisplay.style.left = val + 'px';

    sliderObj.color.width = colorWidth;
    sliderObj.color.style.width = colorWidth + 'px';
};

// --------------------------------------------------------------------------------- disable
SliderUI2.disable = function (sliderId) {
    var sliderObj = this.allSliders[sliderId];
    if (!sliderObj) { console.log("SliderUI2 can't find slider: " + sliderId); return; }
    sliderObj.enabled = false;
    $("#" + sliderObj.thumb.id).removeClass("enabled");
};

// --------------------------------------------------------------------------------- enable
SliderUI2.enable = function (sliderId) {
    var sliderObj = this.allSliders[sliderId];
    if (!sliderObj) { console.log("SliderUI2 can't find slider: " + sliderId); return; }
    sliderObj.enabled = true;
    $("#" + sliderObj.thumb.id).addClass("enabled");
};
