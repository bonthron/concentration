/* 
   ]3()/?|)

   BORD: interactive data table, version 3

   requires jQuery 
   requires DataTable.css

   "bord" is Old English for "table". 
   Because the word "table" is so generic to HTML, "bord" is used as a prefix for identifiers and CSS styles to
   associate them with this code.


   sample config:
var config = { DOMcontainer: "myTableDiv",
               columns: [["myFieldName", "myColumnHeader"], 
                         ["waterAmt", "Water Amount <span class='small'>(g)</span>"], 
                         ["concAmt", "Concentration <span class='small'>(%)</span>"]],
               min-rows: 7,
               max-rows: 7,
               features: ["hover", "remove", "sortArrows"] };


   There is a simple event system, but only supports 1 callback per event.
   Events: "rowClick"

   This version creates the header as a seperate table from the data rows. This is to
   control the number of rows that can be seen at one time, by putting the second table in
   a scrollable div of fixed height. 

*/


//---------------------------------------------------------------------- BordDataTable
function BordDataTable(responseBlockID){

    this.responseBlockID = responseBlockID;
    this.data   = [];
    this.events = [];
}


//---------------------------------------------------------------------- init
BordDataTable.prototype.init = function(configObj) {

    this.id        = configObj.DOMcontainer + "Table";
    this.columns   = configObj.columns;
    this.rows      = configObj.rows;
    this.minRows   = configObj.minRows;
    this.maxRows   = configObj.maxRows;
    this.features  = configObj.features;
    this.container = $('#' + configObj.DOMcontainer);


    var skeleton = "";
    skeleton += this.createHeaderTable();

    if (this.maxRows == 7) {
        skeleton += '<div id="bordScrollDiv_Low">\n';
    } else {
        skeleton += '<div id="bordScrollDiv">\n';
    };
    skeleton += '<table id="' + this.id + '" class="bord">\n';
    skeleton += '  <tbody>\n';
    skeleton += '  </tbody>\n';
    skeleton += '</table>\n';
    skeleton += '</div>\n';

    this.container.html(skeleton);
    this.scrollDiv = $("#bordScrollDiv");

    var self = this;
    this.scrollDiv.on("scroll", function () {
        var log = { event: "scroll-table", scrollTop: self.scrollDiv.scrollTop() };
        self.logAction(log);
    });

    this.updateTable();
}


//---------------------------------------------------------------------- createHeaderTable
BordDataTable.prototype.createHeaderTable = function() {

    var tHead = '<table id="' + this.id + '_headers" class="bord">\n';

    tHead += '<th id="bordTHrowCount" class="bordRowCount"></th>\n';

    for(var i=0; i < this.columns.length; i++){
        tHead += '<th id="bordTH' + i +'" class="bordTH">' + this.columns[i][1] + '</th>\n';
    };

    if(inArray("remove", this.features)){
        tHead += '<th id="bordTHremove" class="bordNoBorder">&nbsp;</th>\n';
    };

    if(inArray("sortArrows", this.features)){
        tHead += '<th id="bordTHsortUp" class="bordNoBorder">&nbsp;</th>\n';
        tHead += '<th id="bordTHsortDown" class="bordNoBorder">&nbsp;</th>\n';
    };

    tHead += '</table>\n';

    return tHead;
}


//---------------------------------------------------------------------- createRow
BordDataTable.prototype.createRow = function(N, data) {

    html = "";

    // TR
    html += '<tr id="bordTR' + N + '" data-row="' + N + '" class="bordTR">\n';


    // ROW COUNT
    html += '<td id="bordTR' + N + 'TD-rowCount" class="bordRowCount">' + (N + 1) + '</td>\n';

    
    // DATA CELLS
    for(var j=0; j < this.columns.length; j++){

        var cellData = "";
        if(data != null){
            var fieldName = this.columns[j][0];
            cellData = data[fieldName];
        };

        html += '<td id="bordTR' + N + 'TD' + j + '" data-row="' + N + '" class="bordTD">' + cellData + '</td>\n'
    };

    
    // SORT feature
    if(inArray("sortArrows", this.features)){
        
        var hiddenClass;
        if(data == null){ hiddenClass = "hidden"; } else { hiddenClass = ""; };

        html += '<td id="bordTR' + N + 'sortUp" class="bordNoBorder"><div id="bordSortUpIcon' + N + '" data-row="' + N + '" class="bordUpIcon ' + hiddenClass + '"></div></td>\n';
        html += '<td id="bordTR' + N + 'sortDown" class="bordNoBorder"><div id="bordSortDownIcon' + N + '" data-row="' + N + '" class="bordDownIcon ' + hiddenClass + '"></div></td>\n';
    };
    

    // REMOVE feature
    if(inArray("remove", this.features)){
        var hiddenClass;
        if(data == null){ hiddenClass = "hidden"; } else { hiddenClass = ""; };

        html += '<td id="bordTR' + N + 'Remove" class="bordNoBorder"><div id="bordRemoveIcon' + N +'" class="bordRemoveIcon ' + hiddenClass + '" data-row="' + N + '"></div></td>\n'
    };
    
    html += '</tr>';

    return html;
}


//---------------------------------------------------------------------- bindEvents
BordDataTable.prototype.bindEvents = function() {

    var self = this;

    // BASIC ROLLOVER
    $(".bordTR").off("mousemove").on("mousemove",function(e){
        var rowNum = this.getAttribute('data-row');
        self.dataRowOver(rowNum);
    });
    
    $(".bordTR").off("mouseout").on("mouseout", function(e){
        var rowNum = this.getAttribute('data-row');
        self.dataRowOut(rowNum);
    });
    
    // CLICK
    $(".bordTD").off("click").on("click", function(e){
        var rowNum = this.getAttribute('data-row');
        self.dataRowClick(rowNum);
    });

    
    // HOVER feature
    if(inArray("hover", this.features)){
        $(".bordTR").addClass("hoverEnabled");
    };        

    
    // REMOVE feature
    if(inArray("remove", this.features)){
        
        $(".bordRemoveIcon").off("click").on("click", function(e){
            var rowNum = Number(this.getAttribute('data-row'));
            self.removeDataRow(rowNum, e);
        });
        
        $(".bordRemoveIcon").off("mouseenter").on("mouseenter", function(e){
            var rowNum = this.getAttribute('data-row');
            $("#" + self.id + " #bordTR" + rowNum).addClass("removeTR");
        });
        
        $(".bordRemoveIcon").off("mouseleave").on("mouseleave", function(e){
            var rowNum = this.getAttribute('data-row');
            $("#" + self.id + " #bordTR" + rowNum).removeClass("removeTR");
        });
    };
    

    // SORT feature
    if(inArray("sortArrows", this.features)){
        
        $(".bordUpIcon").off("click").on("click", function(e){
            var rowNum = Number(this.getAttribute('data-row'));
            self.moveDataRow(rowNum, 'UP');
        });
        
        $(".bordDownIcon").off("click").on("click", function(e){
            var rowNum = Number(this.getAttribute('data-row'));
            self.moveDataRow(rowNum, 'DOWN');
        });
    };
}


//---------------------------------------------------------------------- addDataToTable
BordDataTable.prototype.addDataToTable = function(newData, systemGenerated) {
    
    if(this.isFull() == true){ return; }

    newData.selected = false;

    this.data.push(newData);
    var i = (this.data.length - 1);

    this.updateTable(null, 1);

    if(systemGenerated){
        var log = { event:"new-row-system-generated", rowNum: i, data:newData}
        this.logAction(log);
    }else{
        var log = { event:"new-row", rowNum: i, data:newData}
        this.logAction(log);
    };
}


//---------------------------------------------------------------------- removeDataFromTable
BordDataTable.prototype.removeDataFromTable = function(rowNum, e) {

    this.dataRowOut(rowNum);
    this.data.splice(rowNum, 1);

    this.updateTable();

    var overRow = null;

    if(this.scrollDiv.scrollTop() == 0){
        overRow = rowNum;
    }else if((this.scrollDiv.height() + this.scrollDiv.scrollTop()) == this.scrollDiv.prop("scrollHeight")){
        overRow = (rowNum - 1);
    }else{
        overRow = rowNum;
    };

    if(this.data[overRow] != null){
        this.dataRowOver(overRow);
        $("#" + this.id + " #bordTR" + overRow).addClass("removeTR");
    };

    
    var log = { event:"delete-row", rowNum: rowNum };
    this.logAction(log);

    if(typeof this.events["rowremove"] == "function"){
        this.events["rowremove"].call(this, rowNum);
    };
}


//---------------------------------------------------------------------- removeDataRow
BordDataTable.prototype.removeDataRow = function(rowNum, e) {

    this.removeDataFromTable(rowNum, e);
}


//---------------------------------------------------------------------- moveDataRow
BordDataTable.prototype.moveDataRow = function(rowNum, direction) {

    if(direction == "UP" && rowNum == 0){ return; };
    if(direction == "DOWN" && (rowNum == this.data.length)){ return; };
    if(direction == "DOWN" && (this.data[rowNum+1] == null)){ return; };


    var rowData = this.data.splice(rowNum, 1)[0];
    var blink;

    if(direction == "UP"){
        this.data.splice(rowNum-1, 0, rowData);
        blink = rowNum-1;
    };

    if(direction == "DOWN"){
        this.data.splice(rowNum+1, 0, rowData);
        blink = rowNum+1;
    };

    this.dataRowOut(rowNum);
    $("#" + this.id + " #bordTR" + rowNum + " > td.bordTD").addClass("blinkTR");


    var self = this;
    window.setTimeout(function(){
        $("#" + self.id + " #bordTR" + rowNum + " > td.bordTD").removeClass("blinkTR");
        self.updateTable(blink);
    }, 200)

    var log = { event:"move-row", rowNum: rowNum, direction:direction }
    this.logAction(log);
}


//---------------------------------------------------------------------- selectTableRow
BordDataTable.prototype.selectTableRow = function(rowNum) {

    var dataObj = this.data[rowNum];
    dataObj.selected = !dataObj.selected;
    this.updateTable();
}


//---------------------------------------------------------------------- dataRowOver
BordDataTable.prototype.dataRowOver = function(rowNum) {

    if(this.data[rowNum] != null){
        if(inArray("hover", this.features)){
            $("#" + this.id + " #bordTR" + rowNum + " > td.bordTD").addClass("hilightTR");
        }
        $("#" + this.id + " #bordTR" + rowNum + " td div.bordUpIcon").addClass("hilight");
        $("#" + this.id + " #bordTR" + rowNum + " td div.bordDownIcon").addClass("hilight");
        $("#" + this.id + " #bordTR" + rowNum + " td div.bordRemoveIcon").addClass("hilight");
    };
}


//---------------------------------------------------------------------- dataRowOut
BordDataTable.prototype.dataRowOut = function(rowNum) {
    
    if(this.data[rowNum] != null){
        $("#" + this.id + " #bordTR" + rowNum + " > td.bordTD").removeClass("hilightTR");
        $("#" + this.id + " #bordTR" + rowNum + " td div.bordUpIcon").removeClass("hilight");
        $("#" + this.id + " #bordTR" + rowNum + " td div.bordDownIcon").removeClass("hilight");
        $("#" + this.id + " #bordTR" + rowNum + " td div.bordRemoveIcon").removeClass("hilight");
    };
}


//---------------------------------------------------------------------- dataRowClick
BordDataTable.prototype.dataRowClick = function(rowNum) {

    if(this.data[rowNum] != null){
        
        if(typeof this.events["rowclick"] == "function"){
            this.events["rowclick"].call(this, this.data[rowNum]);
        };
    };
}


//---------------------------------------------------------------------- addEventListener
BordDataTable.prototype.addEventListener = function(eventName, func) {

    this.events[eventName.toLowerCase()] = func;
}


//---------------------------------------------------------------------- removeEventListener
BordDataTable.prototype.removeEventListener = function(eventName, func) {

    this.events[eventName.toLowerCase()] = null;
}


//---------------------------------------------------------------------- updateTable
BordDataTable.prototype.updateTable = function(blink, scroll) {

    var self = this;
    var html = ""
    var len = Math.max(this.data.length, this.minRows);

    for(var i=0; i < len; i++){
        var d = this.data[i];
        html += this.createRow(i, d);
    };
    
    $("#" + this.id + " tbody").html(html);

    if(blink != null){
        $("#" + this.id + " #bordTR" + blink + " > td.bordTD").addClass("blinkTR");

        window.setTimeout(function(){
            $("#" + self.id + " #bordTR" + blink + " > td.bordTD").removeClass("blinkTR");
            self.bindEvents();
        },400);
    }else{
        window.setTimeout(function(){ self.bindEvents(); }, 100)
    };

    if(scroll == 1){
        this.scrollDiv.scrollTop(1000); //arbitrary high number
    };
}


//---------------------------------------------------------------------- logAction
// NOTE: we're adding 1 to row numbers, so count begins at 1 not zero
// internally, like all good programmers, we always count from zero

BordDataTable.prototype.logAction = function(logObj) {

    logObj.eventType = "data-table";

    if(logObj.rowNum != null){
        logObj.rowNum+=1; 
    };

    var tableState = {};
    for(var i=0; i < this.data.length; i++){

        var d = this.data[i];
        
        if(d != null){
            tableState[(i + 1)] = { trialNum: d.trialNum, tuid: d.tuid };
        }else{
            tableState[(i + 1)] = {};
        };
    };

    logObj.tableState = tableState;

    // console.log(logObj);

//    window.SLOGGER.logObject(logObj);
}


//---------------------------------------------------------------------- isFull
BordDataTable.prototype.isFull = function() {

    for(var i=0; i < this.maxRows; i++){
        if(this.data[i] == null){ return false; };
    };

    return true;
}


//---------------------------------------------------------------------- getData
BordDataTable.prototype.getData = function() {

    return JSON.stringify(this.data);
}


//---------------------------------------------------------------------- setData
BordDataTable.prototype.setData = function(d) {

    this.data = JSON.parse(d);

    var log = { event:"pre-populate-table", data: this.data }
    this.logAction(log);

    this.updateTable();
}


//---------------------------------------------------------------------- cleanUp
BordDataTable.prototype.cleanUp = function() {}


function inArray(o, arr) {    

    for(var i=0; i < arr.length; i++){
        if(arr[i] == o){ return true; };
    };
    return false;
}
