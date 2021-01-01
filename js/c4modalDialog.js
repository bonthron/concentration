

// ---------------------------------------------------------------------------- c4ModalDialog
/*
  i return a function as a value
  to open the dialog, invoke that the returned function
  for confirm dialogs, your callback will be invoked when the dialog closes

  msg:    (string) message to display

  config: (string or array), 
           1. STRING can be "alert" or "confirm" to mimic a basic browser dialog
           to rename the confirm buttons, see "customOK" & "cusotmCancel" (below)
           or
           2. ARRAY, to create custom buttons with unique callback functions, pass an ARRAY of objects like this:
           {text:"YOUR_BUTTON_TEXT", func:YOUR_CALLBACK_FUNCTION, thisObj:YOUR_CONTEXT_FOR_THIS_KEYWORD }           

  func:    (function), your callback function to be called by a "confirm" dialog, this callback will be 
           passed a boolean depending on whether OK/Cancel was pushed

  thisObj: (object), an optional object your callback function should be invoked on, DEFAULTS to the global window

  customOK:    (string) alternate button text for the confirm's OK button
  customCancel:(string) alternate button text for the confirm's Cancel button

  examples:
  var myAlertBox = c4ModalDialog("hello world", "alert");
  myAlertBox();

  var myConfirmBox = c4ModalDialog("I Can Has Cheezburger?", "confirm", function(bool){ alert(bool); }, null, "yes", "no");
  myConfirmBox();

  var myCustomBox = c4ModalDialog("I Can Has Cheezburger?", [{text:"yes", func: function(){alert('yes');}}, {text:"no", func:function(){ alert('no'); }},  {text:"maybe", func:function(){ alert('maybe'); }}]);
  myCustomBox();
*/
window._c4GlobalConfirmOK = "OK"; // DEFAULT button text
window._c4GlobalConfirmCancel = "Cancel";

// ---------------------------------------------------------------------------- c4ModalDialog
function c4ModalDialog(msg, config, func, thisObj, customOK, customCancel){

    return function(){ c4ModalDialogFactory(msg, config, func, thisObj, customOK, customCancel); };
};


// ---------------------------------------------------------------------------- c4ModalDialogFactory
function c4ModalDialogFactory(msg, config, func, thisObj, customOK, customCancel){

    if(thisObj == null){ thisObj = window; };
    if(config == null){ config = "alert"; };


    // HTML template
    var html_div = "<div id='c4modalDialog' style='display:none;'></div>\n";

    var html_contents = "";
    html_contents += "<div id='c4modalDialogContainer'>\n";
    html_contents += "<div id='c4modalDialogMsgContainer'></div>\n";
    html_contents += "<div id='c4modalDialogButtonContainer'>\n";
    html_contents += "<div id='c4modalDialogButton1' class='c4modalDialogButton' style='display:none;'>" + window._c4GlobalConfirmOK + "</div>";
    html_contents += "<div id='c4modalDialogButton2' class='c4modalDialogButton' style='display:none;'>" + window._c4GlobalConfirmCancel + "</div>";
    html_contents += "</div>\n";
    html_contents += "</div>\n";


    // add to DOM
    if($("#c4modalDialog").length == 0){ $("body").append(html_div); };
    $("#c4modalDialog").html(html_contents);
    $("#c4modalDialogMsgContainer").html(msg); 


    // simple alert or confirm
    if(typeof config == "string"){
        switch(config.toLowerCase()){

        case "confirm":
            if(typeof func != "function"){ alert("c4ModalDialog is missing a callback function for 'confirm'"); return; };
            if(customOK){$("#c4modalDialogButton1").html(customOK);};
            if(customCancel){$("#c4modalDialogButton2").html(customCancel);};

            $("#c4modalDialogButton1").show();
            $("#c4modalDialogButton2").show();

            $("#c4modalDialogButton1").on("click", function(){
                $("#c4modalDialogButton1").off("click");
                $("#c4modalDialog").hide(); 
                func.call(thisObj, true);  
            });
            $("#c4modalDialogButton2").on("click", function(){
                $("#c4modalDialogButton2").off("click");
                $("#c4modalDialog").hide(); 
                func.call(thisObj, false);  
            });
            break;
            
        case "alert":
        default:
            $("#c4modalDialogButton1").show();
            $("#c4modalDialogButton1").on("click", function(){
                $("#c4modalDialogButton1").off("click");
                $("#c4modalDialog").hide(); 
            });
        };
    };    


    // custom
    if(typeof config == "object"){

        $("#c4modalDialogButtonContainer").html("");

        for(var i=0; i < config.length; i++){

            var buttonText = config[i].text;
            var func       = config[i].func;
            var thisObj    = config[i].thisObj;
            var buttonID   = "c4modalDialogButton" + i;
            if(thisObj == null){ thisObj = window; };

            var newButtonHTML = "<div id='" + buttonID + "' class='c4modalDialogButton'>" + buttonText + "</div>";
            $("#c4modalDialogButtonContainer").append(newButtonHTML);

            $("#" + buttonID).on("click", returnNewHandler(func, thisObj))
        };
    };
    // we'll need this when added handlers in a loop (above)
    function returnNewHandler(f, thisobj){ return function(){ $("#c4modalDialog").hide(); f.call(thisobj); }; };


    // open
    $("#c4modalDialog").show(); 
};


