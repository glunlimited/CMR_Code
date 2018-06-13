//=================================================================
//This SSJS script library consolidates all the validation in one place
//The postValidationError() function flags a control as invalid and provides an error message
//so that the XPages ErrorMessage control is used to display the error on the page.

var validateForm = function(toValidate){
	
var vwKeyWords:NotesView = database.getView("(vwKeywords)");
var configDoc: NotesDocument = vwKeyWords.getDocumentByKey(toValidate)
var valid = true;
var control;
var val;

var arryFieldInfo = configDoc.getItemValue("Choices");
// ***  REPEAT THE FOLLOWING BLOCK OF CODE FOR EACH CONTROL FOR BASIC "REQUIRED" VALIDATION

// For each field, change the Control Name in getComponent() and the error message text in postValidationError()
//   Optionally, modify the IF conditions with more complex JavaScript for value ranges, regular expressions, data lookups, etc.
for (fld in arryFieldInfo)
{
	print("Validation Info: " + fld);
	fldinfo = fld.split("¥");
	control = getComponent(fldinfo[0]); //:javax.faces.component.UIComponent
	//print("Component Info: " + typeof(control));
	val = control.getValue();
	//print("Component Value Info: " + typeof(val) +"\n" + "Component Value Info: " + val);
	if (isEmpty(val)){
		valid = false;
 		postValidationError(control,fldinfo[1]);
	}  
}
//print("Value valid: " + valid);
return valid;
}

//*** ----------------------------------------------------------------   ***

function postValidationError(control, msg) {
 if ((typeof msg) != "string")
         return;
 var msgObj = new javax.faces.application.FacesMessage(javax.faces.application.FacesMessage.SEVERITY_ERROR, msg, msg);
 facesContext.addMessage(control.getClientId(facesContext), msgObj);
 control.setValid(false);
}
//*** ----------------------------------------------------------------   ***

function isEmpty(o){
	return (o == null || @Trim($A(o)[0]) == "" || @Trim($A(o)[0]) == "-----" || @Trim($A(o)[0]) == "Select Judicial Circut" || @Trim($A(o)[0]) == "Not Found" ) ? true : false;
}
//*** ----------------------------------------------------------------   ***

function $A( object ){
	try 
	{
 		if( typeof object === 'undefined' || object === null ){ return []; }
 		if( typeof object === 'string' ){ return [ object ]; }
 		if( typeof object === 'java.util.Date' ){
 			
 			return [ object ]; 
 		}
 		if( typeof object.toArray !== 'undefined' ){return object.toArray();}
 		if( object.constructor === Array ){ return object; } 
 		return [ object ];
	} 
catch( e ) 
{
	//Debug.exceptionToPage( e );
	print("This is the error: " +e);
	return [];
}
}

//=================================================================
