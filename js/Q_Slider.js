/*
  ()_  _\~ |_ | |) [- /?
  
  Q  slider

  --------------------------------------------------  

  -requires jQuery
  -requires Bacon

  --------------------------------------------------  

  <script>
     Q_slider_create("slider1", {width:100, min:0, max:10, step:1, start:0});
  </script>

  <html>
     <div id="slider1"></div>
  </html>

  --------------------------------------------------  

  Q_slider_create(id, configuration-object);

  id
  The HTML page MUST contain a <div> element with this id.
  This code will inject a number of new DOM elements into this container to create the component.
  See the CSS file for more info: Q_Slider.css

  configuration properties:

   width
  Desired width of the component, however because of rounding this width is not guaranteed. 
  An exact width can be assured by choosing a width divisible by the total number of steps in your range.
  total steps = (max - min) / step

   min
  range minimum

   max
  range maximum
  max MUST be larger than min
  
   step
  The divisor of the min-max range. A step may be smaller than 1. (0.5, 0.25, etc.)
  The min-max range MUST be divisible by the step, or an error will be thrown.

   start
  Set the slider to a value on start up. Otherwise, sliders start at their min.


  Q_slider_create("slider1", {});
  An empty configuration object will result in the DEFAULT configuration: 0-100 by 1, 100px.

  --------------------------------------------------  

  Q_slider_getData(id)
  returns the value for the slider by id

  Q_slider_getData(id, value)
  sets the value for the slider by id

  --------------------------------------------------  
  
  total steps = (max - min) / step
  pixelsPerStep = Math.round(width / totalSteps)  
  normalized width = totalSteps * pixelsPerStep;
  slider value = min + (Math.round(left/pixelsPerStep) * step;

  --------------------------------------------------  

  Snapping
  If pixels per step is larger than 1, then multiple css positions will equate to the same slider value.
  On mouseup, all sliders will be snapped to the largest css position for the slider's value.
  This allows the slider to move smoothly between discrete values. The alternative is to snap when the mouse
  is moving creating a 'jump' effect. This is an aesthetic decision. 

  --------------------------------------------------  

  To "drag" a slider:
  First calculate the distance between the down click and current mouse position.
  Apply this same distance to the slider's position (the initial position captured on down click).
  Normalize the new position between min & max. 

  --------------------------------------------------  

  Use Bacon to get mouse events as streams.
  Combine mouse down/up into a single click stream.
  Scan (accumulate) the click stream into a single property:
     this property is either: null or contains an object describing the Last Hit
  
  Combine the mousemove stream with the Last Hit property. 
  If Last Hit is not null, then compute a new position. 

  All position changes are pushed to the position log using SET_Position.
  Observed changes to the position log, will update the UI.

  State is held by the thumb's left position: css("left").

  The slider's value is determined by the left position:
  left = parseInt(rec.thumb.css("left"));
  value = min + (Math.round(left/pixelsPerStep) * step)

  --------------------------------------------------  
*/

function Q_slider(win){

    // expose public API
    win.Q_slider_create = create;
    win.Q_slider_getData = getData;
    win.Q_slider_setData = setData;
    win.Q_slider_disable = disable;



    var domIsReady = false;
    $(document).ready(function(){ domIsReady = true; });
    
    
    // DEFAULT_CONFIG: this object will be cloned for each new slider
    // container, track, thumb, colorLength, readout
    // will be created after DOM load (ready)
    
    var DEFAULT_CONFIG = { id:"default",
                           width:100,
                           min:0,
                           max:100,
                           step:1,
                           totalSteps:100,
                           pixelsPerStep:1,
                           container: null,
                           track:null,
                           thumb:null,
                           colorLength:null,
                           readout:null,
                           disabled:false,
                           start:0
                         };

    var CONFIG_RECORDS = {};  


    // streams are LAZY, so we can create them right away
    
    var thumbDownStream = $(document).asEventStream("mousedown", ".Q-SliderThumb")
        .map(function(e){
            var recID = e.currentTarget.dataset.QID;
            return {msg:"thumb-hit", recID:recID, jqObj:e};
        });
    
    var mouseUpStream = $(document).asEventStream("mouseup")
        .map(function(e){ return {msg:"document-mouse-up", jqObj:e}; });
    
    var mouseMoveStream = $(document).asEventStream("mousemove")
        .map(function(e){ return {msg:"document-mouse-move", jqObj:e}; });
    
    var clickStream = Bacon.mergeAll(thumbDownStream, mouseUpStream);
    
    var Last_Hit = clickStream.scan(null, function(prev, e){
        if(e.msg == "thumb-hit"){
            document.body.style.cursor = "pointer";
            return {
                msg:   "Last_Hit",
                recID: e.recID,
                pos:   parseInt( CONFIG_RECORDS[e.recID].thumb.css("left") ),
                jqObj: e.jqObj
            };
        } else if (e.msg == "document-mouse-up"){
            return null;
        }else{
            return prev;
        };
    });
    
    Bacon.combineAsArray(mouseMoveStream, Last_Hit).onValue(function(arr){
        if(arr[1] != null){
            var moveEvt  = arr[0].jqObj;
            var lastHit  = arr[1];
            var rec      = CONFIG_RECORDS[arr[1].recID];
            
            var pos = calculatePosition(moveEvt, lastHit, rec);
            if(rec.disabled){return;}
            SET_Position(rec, pos); //!!!
        };
    });


    var snapping = mouseUpStream.onValue(function(){
        for(var i in CONFIG_RECORDS){
            if(CONFIG_RECORDS.hasOwnProperty(i)){
                var rec = CONFIG_RECORDS[i];
                var newPos = ((getValue(rec) - rec.min)/rec.step) * rec.pixelsPerStep;

                SET_Position(rec, newPos);  //!!!
                document.body.style.cursor = "auto";
            }};
    });

    
    var positionLog = Bacon.Bus();
    positionLog
        .onValue(function(e){
            var rec = CONFIG_RECORDS[e.recID];
            move(rec, e.pos);
        });


    
    var lastID = null;
    var stemlog = clickStream.onValue(function(e){
        if(e.msg == "document-mouse-up"){
            if(lastID != null){
                var log = {"eventType":"user", "event":"sliderchange", "slider": lastID, "value": getValue(CONFIG_RECORDS[lastID])};
//                window.SLOGGER.logObject(log);
            };
            lastID = null;
        };
        if(e.msg == "thumb-hit"){
            lastID = e.recID;
        };
    });


        
    
    // ----------------------------------------------------------------------- SET_Position!
    function SET_Position(rec, pos){
        positionLog.push({recID:rec.id, pos:pos});
    }


    // ----------------------------------------------------------------------- create
    // clone the default configuration, then overide with the user's 
    // normalize the width
    
    function create(id, configObj){

        var rec = new Object();

        for(var p in DEFAULT_CONFIG){
            if(DEFAULT_CONFIG.hasOwnProperty(p)){ rec[p] = DEFAULT_CONFIG[p]; };
            if(configObj.hasOwnProperty(p)){ rec[p] = configObj[p]; };
        };

        rec.id = id;

        if(((rec.max - rec.min) % rec.step != 0)){
            alert("Q Slider Error: the slider range is not divisible by the step."); return false;
        };

        var totalSteps = ((rec.max - rec.min) / rec.step);
        var pixelsPerStep = Math.round(rec.width / totalSteps); 
        if(pixelsPerStep < 1 ){ pixelsPerStep = 1; };

        normalizedWidth = totalSteps * pixelsPerStep;
        
        rec.width = normalizedWidth;
        rec.pixelsPerStep = pixelsPerStep;
        
        CONFIG_RECORDS[rec.id] = rec;

        if(domIsReady){
            addDomObjectsToRecords(rec.id);
        }else{
            $(document).ready(function(){ addDomObjectsToRecords(rec.id); });
        };

        // return an observable
        var ob = positionLog
            .filter(function(e){ return e.recID == rec.id; })
            .map(function(e){
                var left = e.pos;
                var rec = CONFIG_RECORDS[e.recID];
                var v = rec.min + (Math.round(left/rec.pixelsPerStep) * rec.step);
                return v;
            })
        
        return ob;
    };


    // ----------------------------------------------------------------------- addDomObjectsToRecords
    function addDomObjectsToRecords(recID){

        var rec = CONFIG_RECORDS[recID];
        var jqObjects = makeHTML(rec.id, rec.width);
        
        rec.container   = jqObjects.container;
        rec.track       = jqObjects.track;
        rec.thumb       = jqObjects.thumb;
        rec.colorLength = jqObjects.colorLength;
        rec.readout     = jqObjects.readout;        

        setData(rec.id, rec.start);

    };
        
      
    // ----------------------------------------------------------------------- getData
    function getData(id){

        if(CONFIG_RECORDS.hasOwnProperty(id)){
            return getValue(CONFIG_RECORDS[id]);
        }else{
            return null;
        };
    };

    
    // ----------------------------------------------------------------------- setData
    function setData(id, value){

        if(CONFIG_RECORDS.hasOwnProperty(id)){

            value = Number(value);
            
            var rec = CONFIG_RECORDS[id];
            var newPos = ((value - rec.min)/rec.step) * rec.pixelsPerStep;

            if (newPos < 0){ newPos = 0; };
            if (newPos > rec.width){ newPos = rec.width };
            
            SET_Position(rec, newPos); //!!!

            return true;
        }else{
            alert("Q Slider Error: no record of: " + id);
            return false;
        };
    }


    // ----------------------------------------------------------------------- disable
    function disable(id, bool){
        if(CONFIG_RECORDS.hasOwnProperty(id)){
            var rec = CONFIG_RECORDS[id];
            rec.disabled = !!bool;
        }
    }

          
    // ----------------------------------------------------------------------- getValue
    function getValue(rec){

        var left = parseInt(rec.thumb.css("left"));
        var v = rec.min + (Math.round(left/rec.pixelsPerStep) * rec.step);
        
        return v;
    }

    
    // ----------------------------------------------------------------------- calculatePosition
    function calculatePosition(moveEvent, lastHit, rec){
        
        var hitX     = lastHit.jqObj.clientX;
        var startPos = lastHit.pos;

        var distance = (moveEvent.clientX - hitX);

        var newPos   = (startPos + distance);
                
        if (newPos < 0){ newPos = 0; };
        if (newPos > rec.width){ newPos = rec.width };

        return newPos;
    }

    
    // ----------------------------------------------------------------------- move
    function move(rec, newPos){
        
        var newPosCSS = newPos + "px";
        
        rec.thumb.css("left",   newPosCSS);
        rec.colorLength.css("width",  newPosCSS);
        rec.readout.css("left", newPosCSS);

        rec.readout.text(getValue(rec));        
    }

    
    // ----------------------------------------------------------------------- makeHTML
    function makeHTML(id, width){

        var div = document.getElementById(id);
        div.className = "Q-Slider";
        div.style.width = width + "px";
        div.dataset.QID = id;
        
        var track = document.createElement('div');
        track.className = "Q-SliderTrack";
        track.style.width = width + "px";
        track.dataset.QID = id;
        
        var thumb = document.createElement('div');
        thumb.id = id + "_sliderThumb";
        thumb.className = "Q-SliderThumb enabled ";
        thumb.style.left = 0 + "px";
        thumb.dataset.QID = id;
        
        var readout = document.createElement('div');
        readout.id = id + "_sliderReadout";
        readout.className = "Q-SliderReadout enabled ";
        readout.style.left = 0 + "px";
        readout.dataset.QID = id;
        
        var colorLength = document.createElement('div');
        colorLength.id = id + "_sliderColorLength";
        colorLength.sliderId = id;
        colorLength.className = "Q-SliderColorLength enabled ";
        colorLength.style.left = "0px";
        colorLength.style.width = "0px";
        colorLength.dataset.QID = id;
        
        div.appendChild(readout);
        div.appendChild(track);
        track.appendChild(colorLength);
        track.appendChild(thumb);

        return { container:   jQuery(div),
                 track:       jQuery(track),
                 thumb:       jQuery(thumb),
                 colorLength: jQuery(colorLength),
                 readout:     jQuery(readout) };
    };
};

