
// ========================================================================= DropSequence
function DropSequence(n){

    this.num     = n;  //number of circles
    this.radius  = 6;
    this.spacing = 18;
    this.startY  = 0;
    this.W       = 30;
    this.H = (this.num * this.spacing);
    this.loop_at = this.startY + this.H;
    this.fade_at = (this.H - 70);

    this.container = new cjs.Container();
    this.drops = new cjs.Shape();
    this.allCircles = [];

    var y = (this.startY - this.H); // first y-coor is negative to "drop in", before looping 
    
    // build circle array
    for(var i=0; i < this.num; i++){
        this.allCircles[i] = {y:y, alpha:1, start:y};
        y += this.spacing;
    };

    this.one = {y:y, alpha:1, start:y};

    var mask = new cjs.Shape();
    mask.graphics.beginFill("#000000");
    mask.graphics.drawRect(0, 0, this.W, this.H);
    mask.cache(0, 0, this.W, this.H);

    this.container.filters = [
        new createjs.AlphaMaskFilter(mask.cacheCanvas)
    ];
    this.container.addChild(this.drops);

    this.running = false;
}

// ------------------------------------------------------------------------- move
DropSequence.prototype.move = function(){

    this.drops.graphics.clear();

    for(var i=0; i < this.num; i++){
        var c = this.allCircles[i];

        c.y += 1.5;

        // fade
        if(c.y > this.fade_at){
            c.alpha -= .02;
            if(c.alpha < 0){ c.alpha = 0; }; //correct for floating pt errors
        }

        // loop back 
        if((c.y > this.loop_at) && this.running){  
            c.y = this.startY;  
            c.alpha = 1;
        };
        
        var color = cjs.Graphics.getRGB(0x397fba, c.alpha);
        this.drops.graphics.beginFill(color).drawCircle(this.radius, c.y, this.radius);
    };
    this.container.cache(0, 0, this.W, this.H);
}

// ------------------------------------------------------------------------- start
DropSequence.prototype.start = function(){

    this.running = true;
    
    // advance 20px so first drop appears quickly
    for(var i=0; i < this.num; i++){ this.allCircles[i].y += 20; };

    var self = this;
    this.tickClosure = function(){ self.move(); };
    cjs.Ticker.addEventListener("tick", this.tickClosure);
}

// ------------------------------------------------------------------------- stop
DropSequence.prototype.stop = function(){

    this.running = false;
}

// ------------------------------------------------------------------------- reset
DropSequence.prototype.reset = function(){

    this.running = true;
    
    cjs.Ticker.removeEventListener("tick", this.tickClosure);

    for(var i=0; i < this.num; i++){ 
        this.allCircles[i].y = this.allCircles[i].start; 
        this.allCircles[i].alpha = 1;
    };
    this.one.y = this.one.start;
    this.one.alpha = 1;

    this.drops.graphics.clear();

    this.container.cache(0, 0, this.W, this.H);
}
