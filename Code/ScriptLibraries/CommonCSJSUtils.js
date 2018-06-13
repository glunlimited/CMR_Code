// Validates that the input string is a valid date formatted as "mm/dd/yyyy"
function isValidDate(dateString)
{
    // First check for the pattern
    if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))
        return false;

    // Parse the date parts to integers
    var parts = dateString.split("/");
    var day = parseInt(parts[1], 10);
    var month = parseInt(parts[0], 10);
    var year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if(year < 1000 || year > 3000 || month == 0 || month > 12)
        return false;

    var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

    // Adjust for leap years
    if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
}

function loadValidationErrors(idErrors,idHover) {
	var nodeErrors,nodeHover;
	try {
		nodeErrors=dojo.query("[id='"+idErrors+"']")[0];
		nodeHover=dojo.query("[id='"+idHover+"']")[0];
	} catch (e) {
		return;
	}
	if ((typeof nodeErrors=="undefined") || (typeof nodeHover=="undefined")) return;	
	dojo.connect(nodeHover,'onmouseover',dojo.hitch(dijit,"showTooltip","<div class=ValidationErrors>"+nodeErrors.innerHTML+"</div>", nodeHover,['after', 'below']));
	dojo.connect(nodeHover,'onmouseout',dojo.hitch(dijit,"hideTooltip",nodeHover));	
}

function attachValidationMessages(jsonValidationMessages) {
	dojo.query(".notValid").removeClass("notValid");
	dojo.forEach(jsonValidationMessages,function(Message){
		var id=Message.id;
		var arr=id.split(":fld_");
		var idLabel=arr.join(":lbl_");
		var lbl=dojo.byId(idLabel);
		if (lbl) {
			dojo.addClass(lbl,"notValid");
			new dijit.Tooltip({
			     connectId: lbl,
			     label: Message.message
			});	
		}
	})
}