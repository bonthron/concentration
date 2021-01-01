
// --------------------------------------------------------------------- Concentration
function Concentration(ready){

    this.table1 = null;
    this.ANIME = null;
    this.restoreData = null;
    this.ready = ready;
    this.running = false;

    /*
      In 2017, this sim had solid solutes only and used a formula that relied on a number of constants.
      In 2017, a gas solute has been added, but it uses a different formula 
      Both are below...
     */
    this.SOLID_CONSTANTS = [
        {temp: 10,  mix: 190.5,  k: 59.5,  w: 71.8},
        {temp: 20,  mix: 203.9,  k: 65.0,  w: 78.6},
        {temp: 30,  mix: 219.5,  k: 70.7,  w: 86.4},
        {temp: 40,  mix: 238.1,  k: 76.1,  w: 95.7},
        {temp: 50,  mix: 260.4,  k: 81.2,  w: 104.5},
        {temp: 60,  mix: 287.3,  k: 85.9,  w: 116.8},
        {temp: 70,  mix: 320.5,  k: 90.8,  w: 131.0},
        {temp: 80,  mix: 362.1,  k: 95.3,  w: 149.5}
    ];

    this.solidConcentrationFormula = function(solute, water, constant){

        if ((solute/(solute + water)) < (constant/(constant + 100))){
            c = solute/(solute + water);
        }else{
            c = constant/(constant + 100);
        }
        c =  Math.round(c * 100);
        return c;
    };

    this.GAS_MAX_CONCENTRATIONS = [
        {temp: 10, pressures: {100: 41.5, 150: 45.2, 200: 51.0, 250: 54.8, 300: 58.2, 350: 64.2, 400: 71.1}},
        {temp: 20, pressures: {100: 34.6, 150: 37.8, 200: 43.1, 250: 47.2, 300: 50.0, 350: 54.1, 400: 58.7}},
        {temp: 30, pressures: {100: 29.1, 150: 33.0, 200: 38.2, 250: 41.7, 300: 43.8, 350: 47.7, 400: 50.3}},
        {temp: 40, pressures: {100: 24.2, 150: 28.2, 200: 33.8, 250: 37.6, 300: 39.2, 350: 41.8, 400: 45.1}},
        {temp: 50, pressures: {100: 19.4, 150: 24.0, 200: 28.4, 250: 31.7, 300: 34.9, 350: 37.1, 400: 39.6}},
        {temp: 60, pressures: {100: 15.3, 150: 20.1, 200: 25.0, 250: 26.2, 300: 29.1, 350: 32.0, 400: 34.9}},
        {temp: 70, pressures: {100: 10.8, 150: 15.5, 200: 20.8, 250: 22.5, 300: 24.1, 350: 27.5, 400: 30.3}},
        {temp: 80, pressures: {100:  5.3, 150: 9.6,  200: 17.4, 250: 18.7, 300: 21.1, 350: 23.2, 400: 26.1}}
    ];

    this.gasConcentrationFormula = function(solute, water, max){
        var c = (solute/(solute + water)) * 100; 
        c = Math.round(c * 10)/10; //round to 1 decimal
        if(c > max){ c = max; };

        c =  Math.round(c);
        return c;
    };

    
    this.tableConfig = { DOMcontainer: "table1",
                         columns: [
                             ["soluteType", "Solute<br />Type"],
                             ["containerShape", "Container<br />Shape"],
                             ["soluteAmt", "Solute<br />Amount"],
                             ["waterAmt", "Water<br />Amount"],
                             ["temperature", "Temperature"],
                             ["pressure", "Pressure"],
                             ["concentration", "Concentration"]],
                         minRows: 7,
                         maxRows: 40,
                         features: ["remove"] };




    this.preloader = new cjs.LoadQueue();

    var manifest = [ 
        {src:"images/beaker.png", id:"beaker"},
        {src:"images/flask.png", id:"flask"},
        {src:"images/roundbottom.png", id:"roundbottom"},        
        {src:"images/tube.png", id:"tube"}        
    ];

    var self = this;
    
    this.preloader.addEventListener("complete", function(){ 
        self.preloader.removeAllEventListeners();
        self.init();
    });

    this.preloader.loadManifest(manifest);   
}


// --------------------------------------------------------------------- init
Concentration.prototype.init = function(){

    var self = this;
    
    this.table1 = new BordDataTable("concentration2017");
    this.table1.init(this.tableConfig);

    if(this.restoreData != null){
        this.table1.setData(this.restoreData);
        this.restoreData = null;
    };

    
    this.ANIME = new ConcentrationAnime("concentrationCanvas", this);

    var runTrial = $("#runTrial").asEventStream("click")
    
    Q_slider(window);
    
    // Q_slider returns a stream
    var s1 = Q_slider_create("s1", {width:100, min:0, max:400, step:25, start:200});
    var s2 = Q_slider_create("s2", {width:100, min:0, max:100, step:10, start:50});
    var s3 = Q_slider_create("s3", {width:100, min:10, max:80, step:10, start:0});
    var s4 = Q_slider_create("s4", {width:100, min:100, max:400, step:50, start:0});


    // make properties from streams whose initial values are the same as the slider's start value
    var soluteAmt   = s1.toProperty(0);
    var waterAmt    = s2.toProperty(0);
    var temperature = s3.toProperty(10);
    var pressure    = s4.toProperty(100);

    // properties from dropdowns
    var soluteType = $("#soluteType")
        .asEventStream("change")
        .map(function(e){ return e.currentTarget.value; })
        .toProperty($("#soluteType").val());

    var containerShape = $("#containerShape")
        .asEventStream("change")
        .map(function(e){ return e.currentTarget.value; })
        .toProperty($("#containerShape").val());

    // look up solidConstant by temperature and solute type
    var solidConstant = s3.combine(soluteType, function(temp, type){
        return self.SOLID_CONSTANTS.filter(function(o){ return o.temp == temp; })[0][type];
    });


    var gasMax = s3.combine(s4, function(temp, pres){
        var row = self.GAS_MAX_CONCENTRATIONS.filter(function(o){ return o.temp == temp})[0];
        return row.pressures[pres];
    });

    
    var concentration = Bacon.combineAsArray(soluteType, s1, s2, s3, solidConstant, gasMax).map(function(e){
        var soluteType = e[0];
        var solute     = e[1];
        var water      = e[2];
        var temp       = e[3];
        var constant   = e[4];
        var gasMax     = e[5];
        var c;

        if(soluteType == "g"){
            c = self.gasConcentrationFormula(solute, water, gasMax);
        }else{
            c = self.solidConcentrationFormula(solute, water, constant);
        };
    
        if(water < 1){ c = -1; }; // concentration for no water is undefined, but we'll use -1
        return c;
        
    }).toProperty(-1);


    var percipitate = Bacon.combineWith(function(c, water, solute){
        var ratio = (c/100);
        return  solute - (ratio * water);
    }, solidConstant, waterAmt, soluteAmt);


    var trialState = Bacon.combineTemplate(    // wrap it all up
        {"soluteType":soluteType,
         "containerShape":containerShape,
         "soluteAmt":soluteAmt,
         "waterAmt":waterAmt,
         "temperature":temperature,
         "pressure":pressure,
         "concentration":concentration,
         "percipitate":percipitate
        });

    
    // bacon 'when' only fires for stream updates not properties
    // runTrial is a stream, trialState is not
    
    var ALL_TRIALS = Bacon.when([runTrial, trialState], function(a,b){
        b.trialID = Math.round(Math.random() * 100000);
        return b;
    })
        .onValue(function(t){
            if(self.table1.isFull()){
                //window.SLOGGER.logObject({eventType:"item", event:"error-message", msg:"table-full"}); 
                var warningDialog = c4ModalDialog("Delete a row of data to run another trial.", "alert");
                warningDialog();
            }else{
                var log = {"eventType":"user", "event":"runTrial", "id": "runTrial", "trailState": t};
                //window.SLOGGER.logObject(log);
                self.running = true;
                self.ANIME.runTrial(t);
            };
        });

    
    var tempReadout = $("#tempReadout");
    temperature.onValue(function(e){ tempReadout.html(e + "&deg;C"); });
    
    pressure.onValue(function(e){
        var scaleAmt = 0.4 + ((e/400) * 0.4); //between .4 & .8;
        scaleAmt = Math.round(scaleAmt * 100)/100;
        self.ANIME.arrowContainer.scaleX = self.ANIME.arrowContainer.scaleY = scaleAmt;
    });

    containerShape.onValue(function(e){
        var log = {"eventType":"user", "event":"selectionchange", "id": "containershape", "value": e};
        //window.SLOGGER.logObject(log);
        
        self.ANIME.beaker.visible = false;
        self.ANIME.flask.visible = false;
        self.ANIME.round.visible = false;
        self.ANIME[e].visible = true;
    });

    soluteType.onValue(function(e){
        var log = {"eventType":"user", "event":"selectionchange", "id": "solutetype", "value": e};
        //window.SLOGGER.logObject(log);
        if(e == "g"){ self.ANIME.tweenTube("DOWN"); }else{ self.ANIME.tweenTube("UP"); };
    })

    
    trialState.onValue(function(e){// reset on ANY change
        if(!self.running){self.ANIME.reset();};
    }); 

    if(typeof(this.ready) == "function"){
        this.ready();
    }
};


// --------------------------------------------------------------------- getData
Concentration.prototype.getData = function(){
    return this.table1.getData();
}


// --------------------------------------------------------------------- setData
Concentration.prototype.setData = function(d){
    this.restoreData = d;
}

// --------------------------------------------------------------------- disable
Concentration.prototype.disable = function(){
    $("#controlCover").show();
}

// --------------------------------------------------------------------- cleanUp
Concentration.prototype.cleanUp = function(){

    this.table1.cleanUp();
    this.ANIME.cleanUp();
}



// --------------------------------------------------------------------- ConcentrationAnime
function ConcentrationAnime(canvasID, task){
    var self = this;

    this.stage = new cjs.Stage(canvasID);
    this.task = task;
    
    cjs.Ticker.framerate = 60;
    cjs.Ticker.timingMode = cjs.Ticker.RAF;
    cjs.Ticker.addEventListener('tick', this.stage);
    
    this.dropsIN = new DropSequence(6);
    this.dropsIN.container.x = 145;
    this.dropsIN.container.y = 10;

    this.water = new cjs.Shape();
    this.water.y = 270;
    this.water_max_height = 170;

    this.tube = new cjs.Bitmap(task.preloader.getResult('tube'));      
    this.tube.x = 150;
    this.tube.y = -270;
    this.tube.visible = true;

    this.flask = new cjs.Bitmap(task.preloader.getResult('flask'));      
    this.flask.x = 0;
    this.flask.visible = false;

    this.beaker = new cjs.Bitmap(task.preloader.getResult('beaker'));
    this.beaker.x = 0;
    this.beaker.visible = false;
    
    this.round = new cjs.Bitmap(task.preloader.getResult('roundbottom'));
    this.round.x = 0;
    this.round.visible = false;
    
    var arrowSpeed = 600;
    var arrowGraphic = new cjs.Graphics();
    arrowGraphic.ss(.5).s("#5D6066").f("#5D6066").r(0,0,5,30);
    arrowGraphic.drawPolyStar(2,30, 10, 3, 0, 90).ef(); //x,y,radius,sides,star,degrees
    
    this.arrow = new cjs.Shape(arrowGraphic);
    this.arrow.x = 60;
    this.arrow.y = 100;

    this.arrow2 = new cjs.Shape(arrowGraphic);
    this.arrow2.x = 35;
    this.arrow2.y = 100;

    this.arrowContainer = new cjs.Container();        
    this.arrowContainer.regX = 50;
    this.arrowContainer.regY = 100;
    this.arrowContainer.x = 30;
    this.arrowContainer.y = 35;
    this.arrowContainer.addChild(this.arrow);
    this.arrowContainer.addChild(this.arrow2);
    
    cjs.Tween.get(this.arrow, {loop:true}).to({y:105}, arrowSpeed).to({y:100}, arrowSpeed).to({y:95}, arrowSpeed).to({y:100}, arrowSpeed)
    cjs.Tween.get(this.arrow2, {loop:true}).to({y:95}, arrowSpeed).to({y:100}, arrowSpeed).to({y:105}, arrowSpeed).to({y:100}, arrowSpeed)
    
    this.allParticles = [];
    this.particleContainer = new cjs.Container();

    
    this.whiteSolute = new cjs.Graphics();
    this.whiteSolute.ss(.5).s("#000").f("#fff").dc(4,4,4);

    this.redSolute = new cjs.Graphics();
    this.redSolute.ss(.5).s("#fff").f("#7F0000").dc(4,4,4);
    
    for(var i=0; i < 100; i++){   
        var p = new cjs.Shape();
        this.particleContainer.addChild(p);
        this.allParticles.push(p);
    };


    // BUBBLES
    this.bubbleContainer = new cjs.Container();

    this.bubble = new cjs.Shape();
    this.bubble.graphics.f("#fff").dc(2,2,2).ef();
    this.bubble.cache(0,0,4,4);

    this.allBubbles = [];

    for(var i=0; i < 200; i++){   
        var b = new cjs.Bitmap(this.bubble.cacheCanvas);
        this.bubbleContainer.addChild(b);
        this.allBubbles.push(b);
    };
    this.resetBubbles = function(){
        self.allBubbles.map(function(b){
            b.x = 160;
            b.y = 245;
            b.visible = false;
            b.alpha = 1;
        });
    };
    this.resetBubbles();
    
    this.stage.addChild(this.dropsIN.container);
    this.stage.addChild(this.water);
    this.stage.addChild(this.bubbleContainer);
    this.stage.addChild(this.tube);
    this.stage.addChild(this.particleContainer);
    this.stage.addChild(this.flask);
    this.stage.addChild(this.beaker);
    this.stage.addChild(this.round);
    this.stage.addChild(this.arrowContainer);
}


// --------------------------------------------------------------------- runTrial
ConcentrationAnime.prototype.runTrial = function(t){

    var self = this;
    
    $("#controlCover").show();
    
    this.allParticles.map(function(p){ p.alpha = 0; });
    
    var wait = 0;
    
    if(t.waterAmt > 0){
        this.tweenWaterLevel(1500, t.waterAmt);
        wait += 2000;
        
        var concentrationTween = cjs.Tween.get({c:0})
            .wait(wait + 2000)
            .to({c:t.concentration}, 1000)

        concentrationTween.addEventListener("change", function(evt){
            var c = Math.round(evt.target.target.c);
            $("#concentrationReadoutValue").html(c + "%");
        });


        // color the water
        if(t.soluteType == "mix" && t.concentration > 0){

            var cr = Math.round((t.concentration/100) * 100) / 100; // concentration between 0-1 (rounded)
            var color = interpolateColor("ffffff", "CC0000", cr)
            var px = (t.waterAmt/100) * self.water_max_height;  //cf. tweenWaterLevel
            
            var colorTween = cjs.Tween.get({c:0})
                .wait(wait + 2000)
                .to({c:1}, 1000)
            
            colorTween.addEventListener("change", function(evt){
                var c = evt.target.target.c;
                self.water.graphics.clear();
                self.water.graphics.beginFill("#" + interpolateColor("397fba", color, c)).drawRect(0, -px, 290, px);
            });
        };

    };

    // solid particle anime
    if(t.soluteAmt > 1 && t.soluteType != "g"){
        var num = 0; 
        if(t.soluteAmt < 4){ num = t.soluteAmt; }else{ num = Math.round(t.soluteAmt/4); };

        var pNum = 0;
        if(t.percipitate > 0){
            if(t.ppercipitate < 4){ pNum = t.percipitate; }else{ pNum = Math.round(t.percipitate/4); };
        };
        
        for(var i=0; i < num; i++){   

            var dissolve = true;
            if(t.waterAmt < 1){
                dissolve = false; //no water?, all particles percipitate
            }else {
                if(i < pNum){ dissolve = false; };
            };

            var alpha = dissolve ? 0 : .8;

            var p = this.allParticles[i];
            if(t.soluteType == "mix"){
                p.graphics = self.redSolute;
            }else{
                p.graphics = self.whiteSolute;
            };
            p.cache(0,0,8,8);
            p.alpha = 0;
            p.x = 150;
            p.y = -50;
            var delta = (Math.random() < .5) ? (p.x + (Math.random()) * 20) : (p.x - (Math.random()) * 25);

            cjs.Tween.get(p).wait(wait)
                .to({alpha:.8})
                .to({y:(258 - (Math.random() * 4)), x:delta, alpha:alpha}, 2000 + (Math.random() * 1000))
        };        
        
        wait += 3000;
    };


    // gas bubble anime
    if(t.soluteType == "g" && t.soluteAmt > 1 && t.waterAmt > 0){

        var num = Math.round(t.soluteAmt/4);  // keep below 100
        var pNum = ((t.concentration/100) * num);  // percip
        var speed = 800;

        for(var i=0; i < num; i++){   
            var b = self.allBubbles[i];
            b.visible = true;

            var dissolve = (i < pNum) ? true : false;

            var dir = (Math.random() > .5) ? 1 : -1;  // direction for horizontal scattering
            
            var newY = this.water.y - ((t.waterAmt/100) * this.water_max_height); 
            var newX = b.x + (Math.random() * 30) * dir; 

            if(dissolve){
                cjs.Tween.get(b).wait(wait).to({y:(b.y + 15)}, 100).to({y:newY, x:newX}, speed)
                cjs.Tween.get(b).wait(wait).wait(100).to({alpha:0}, 500)
            }else{
                cjs.Tween.get(b).wait(wait).to({y:(b.y + 15)}, 100).to({y:newY, x:newX}, speed).wait(400).to({alpha:0}, 400);
            };

            wait += 50;
        };

        wait += speed;
    };


    cjs.Tween.get({}).wait(wait).call(function(evt){

        // a few cheap hacks
        if (t.soluteType == "mix") { t.soluteType = "Drink Mix"; };
        if (t.soluteType == "g") { t.soluteType = "G"; };
        if (t.soluteType == "k") { t.soluteType = "K"; };
        if(t.concentration == -1){ t.concentration = "-"; };
        if(t.containerShape == "flask"){ t.containerShape = "Erlenmeyer"; };

        self.task.table1.addDataToTable(t);
        $("#controlCover").fadeOut();
        self.task.running = false;        
    });
};


// --------------------------------------------------------------------- tweenWaterLevel
ConcentrationAnime.prototype.tweenWaterLevel = function(seconds, amt){
    
    var self = this;
    var newH = (amt/100) * this.water_max_height; 

    this.dropsIN.start();
    
    var px;
    var t = cjs.Tween.get({h:0});
    t.addEventListener("change", function(evt){
        
        px = evt.target.target.h;
        self.water.graphics.clear();
        self.water.graphics.beginFill("#397fba").drawRect(0, -px, 290, px); // water BG color
        });
    
    t.wait(500)
        .to({h:newH}, seconds, cjs.Ease.sineOut)

    var tt = cjs.Tween.get({})
        .wait(1000)
        .call(function(evt){  self.dropsIN.stop();  })
        .wait(1000)
        .call(function(evt){  self.dropsIN.reset();  })
};


// --------------------------------------------------------------------- tweenTube
ConcentrationAnime.prototype.tweenTube = function(direction){

    if(direction == "DOWN"){
        cjs.Tween.get(this.tube).to({y:0}, 300)
    };

    if(direction == "UP"){
        cjs.Tween.get(this.tube).to({y:-270}, 300)
    };
};


// --------------------------------------------------------------------- reset
ConcentrationAnime.prototype.reset = function(){

    for(var i=0; i < this.allParticles.length; i++){   
        this.allParticles[i].alpha = 0;
    };
    this.resetBubbles();

    this.dropsIN.reset();
    this.water.graphics.clear();

    $("#concentrationReadoutValue").html("");
};


// --------------------------------------------------------------------- cleanUp
ConcentrationAnime.prototype.cleanUp = function(){

    cjs.Ticker.removeEventListener('tick', this.stage);

    this.stage.removeAllChildren();
    this.stage.enableMouseOver(0);
    this.stage.enableDOMEvents(false);
    this.stage.removeAllEventListeners();
    this.stage.uncache();
    this.stage = null;
}



// --------------------------------------------------------------------- colors
function rgbToHex(R,G,B) {return toHex(R)+toHex(G)+toHex(B)};
function toHex(n) {
    n = parseInt(n,10);
    if (isNaN(n)) return "00";
    n = Math.max(0,Math.min(n,255));
    return "0123456789ABCDEF".charAt((n-n%16)/16)
        + "0123456789ABCDEF".charAt(n%16);
};
function hexToRgb(hex) {
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return [r,g,b];
};
function interpolateColor(hex1, hex2, f){

    var c1 = hexToRgb(hex1);
    var c2 = hexToRgb(hex2);
    var r1 = c1[0], g1 = c1[1], b1 = c1[2];
    var r2 = c2[0], g2 = c2[1], b2 = c2[2];

    var R = r1 + f * (r2 - r1);
    var G = g1 + f * (g2 - g1);
    var B = b1 + f * (b2 - b1);

    return rgbToHex(R,G,B);
};
