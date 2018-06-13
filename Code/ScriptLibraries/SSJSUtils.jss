var docTemp:NotesDocument;

function deleteFile(strPath)
{
	var InputFile:java.io.File = new File(strPath);
	InputFile.getClass().getMethod("delete", null).invoke(InputFile, null);
}
function getJSDBPath(strDBPath)
{
	return @ReplaceSubstring(strDBPath,"\\","\\\\")
}

function hasDoc(dbToCheck,strIDToCheck)
{
	var found = false
	try
	{
		docTemp = dbToCheck.getDocumentByUNID(strIDToCheck)
		if(docTemp != null)
		{
			found = true
		}
	}
	catch(err)
	{
		found = false
	}
	return found
}

function getDoc(dbToCheck,strIDToCheck)
{
	var docToReturn:NotesDocument
	try
	{
		docToReturn = dbToCheck.getDocumentByUNID(strIDToCheck)
	}
	catch(err){}
	return docToReturn
}
function getNextCollectionDoc(docToSet,collToGet)
{
	docTemp = collToGet.getNextDocument(docToSet)
	docToSet.recycle()
	docToSet = docTemp
	return docToSet	
}
function getAsKey(strString)
{
	return (session.evaluate("@Middle(@Password(\"" + strString+ "\");\"(\";\")\")")).firstElement()
}

function getProfilePhoto(Person){
	importPackage(mil.army.jagc.sites);
	var strImg = "\\DefaultAvatar.png";
	
	var docProfile:NotesDocument = Person.getDocument();
	var photoName = docProfile.getItemValueString("PhotoStandard");
	if (!photoName.equals("")){
		strImg = Profile.getPhotoBaseUrl() + docProfile.getUniversalID() + "/$File/" + photoName + "?openelement"
	}
	return strImg
}

function removePhoto(Person){
	var docProfile:NotesDocument = Person.getDocument();
	docProfile.removeItem("JAGC_Photo");
	docProfile.createRichTextItem("JAGC_Photo");
	docProfile.replaceItemValue("PhotoOriginal","");
	docProfile.replaceItemValue("PhotoStandard","");
	docProfile.replaceItemValue("PhotoThumb","");
	docProfile.save();
}

function extractPhoto(Person,ProfilePhoto){
	importPackage(java.io)
	importPackage(mil.army.jagc.sites);

	var docProfile:NotesDocument = Person.getDocument();
	var docBackend:NotesDocument = ProfilePhoto.getDocument();
	if(docBackend.hasEmbedded()){
		var rtf:NotesRichTextItem = docBackend.getFirstItem("JAGC_Photo")
		var vEmbeddedObj = rtf.getEmbeddedObjects();
		var strExtractFolder = AppSettings.getFilePaths().get("AttachmentExtractFolder");
		if (!strExtractFolder.equals("E:\\Applications\\Sites\\AttachmentExtract")){
			strExtractFolder = "E:\\Applications\\Sites\\AttachmentExtract";
			AppSettings.setPhotoExtractPaths("E:\\Applications\\Sites\\AttachmentExtract", "E:\\Applications\\Sites\\ResizeOutput");
		}
		var strPhotoOutputFolder = AppSettings.getFilePaths().get("ResizeOutputFolder");

		var extractFolder:File  = new File(strExtractFolder);
		if(!extractFolder.exists())extractFolder.mkdirs();
		if(vEmbeddedObj.elementAt(0)){
			var objAttachment:NotesEmbeddedObject = vEmbeddedObj.elementAt(0)
			objAttachment.extractFile(strExtractFolder + "\\" + objAttachment.getName())
			strExtractFolder = strExtractFolder + "\\" + objAttachment.getName()
			var extn = @RightBack(objAttachment.getName(),".")
			var standardSize = "ProfilePhoto." + extn
			var thumbNail = "ThumbNail." + extn
			docProfile.replaceItemValue("FileName",objAttachment.getName());
			
			objAttachment.remove();
			objAttachment.recycle();	
			var resizer = new ImageResizer(strExtractFolder,strPhotoOutputFolder +  "\\" + standardSize,250,180);
			var flag = resizer.resizeImage();
			resizer = new ImageResizer(strExtractFolder,strPhotoOutputFolder +  "\\" + thumbNail,80,50);
			flag = resizer.resizeImage();
			
			if(flag){
				var rtItem:NotesRichTextItem = docProfile.getFirstItem("JAGC_Photo");
				if (rtItem == null) rtItem = docProfile.createRichTextItem("JAGC_Photo");
				rtItem.embedObject(lotus.domino.local.EmbeddedObject.EMBED_ATTACHMENT, null, strExtractFolder, null)
				rtItem.embedObject(lotus.domino.local.EmbeddedObject.EMBED_ATTACHMENT, null, strPhotoOutputFolder +  "\\" + standardSize, null)
				rtItem.embedObject(lotus.domino.local.EmbeddedObject.EMBED_ATTACHMENT, null, strPhotoOutputFolder +  "\\" + thumbNail, null)
				docProfile.replaceItemValue("PhotoStandard", standardSize)
				docProfile.replaceItemValue("PhotoThumb", thumbNail)
				docProfile.save()
				deleteFile(strExtractFolder)
				deleteFile(strPhotoOutputFolder)
			}	
		}
	}
	docBackend.remove(true)
}

function getAttachmentsList(docAttachment:NotesDocument)
{
	var vAttachmentNames =  session.evaluate("@AttachmentNames",docAttachment)
	if(vAttachmentNames.size()==0)return null
	var vAttachmentLengths =  session.evaluate("@AttachmentLengths",docAttachment)
	var attachmentLength = 0
	var size=""
	var type=""
	var arrAttachment = []
	var kb=1024
	var mb=1024*1024
	for(var i=0;i<vAttachmentNames.size();i++)
	{
		attachmentLength = vAttachmentLengths.get(i)
		if(attachmentLength>0)
		{
			if(attachmentLength > mb)
			{
				size = (attachmentLength/mb).toFixed(1) + " MB"
			}
			else if(attachmentLength > kb)
			{
				size = (attachmentLength/kb).toFixed(1) + " KB"
			}
			else
			{
				size = attachmentLength + " bytes"
			}
			type = @LowerCase(@Left(@RightBack(vAttachmentNames.get(i),"."),3))
			arrAttachment.push({"Name":vAttachmentNames.get(i),"Size":size,"Type":type})
		}	
	}
	return arrAttachment
}

function searchView()
{
	sessionScope.put("ViewStartIndex",0)
	if(getComponent("inputText1").getValue() == compositeData.DefaultFieldText || getComponent("inputText1").getValue()=="")
	{
		return
	}	
	
	
	var objViewProperties = {"ViewKey":getCurrentView()}
	objViewProperties.HomeDocTab = sessionScope.get("HomeDocTab");
	objViewProperties.DepartmentID = sessionScope.get("CurrentDepartmentID")
	objViewProperties.Category = (sessionScope.get("CurrentCategory")==null)?"":sessionScope.get("CurrentCategory")
	objViewProperties.Tag = sessionScope.get("CurrentTag")
	objViewProperties.FilterKeys = sessionScope.get("FilterKeys")

	var strFilter = "";
	var searchQuery = "";
	if(objViewProperties.DepartmentID != null && objViewProperties.DepartmentID != "")
	{
		searchQuery = "[DepartmentDocID]=" + objViewProperties.DepartmentID
		strFilter = UserContext.getDepartments().get(objViewProperties.DepartmentID)
	}
	if(objViewProperties.Category != null && objViewProperties.Category != "")
	{
		searchQuery += (searchQuery=="")?"":" AND "
		strFilter += (strFilter=="")?"":"\\"
		searchQuery += "[Category]=" + objViewProperties.Category
		strFilter += objViewProperties.Category
	}	
	if(objViewProperties.Tag != null)
	{
		searchQuery += (searchQuery=="")?"":" AND "
		strFilter += (strFilter=="")?"":"\\"			
		searchQuery += "[Categories]=" + objViewProperties.Tag 
		strFilter += objViewProperties.Tag
	}	
	searchQuery += (searchQuery=="")?"":" AND "
	searchQuery+=getComponent("inputText1").getValue();
	strFilter += (strFilter=="")?"":"\\"
	strFilter += getComponent("inputText1").getValue()
	
	sessionScope.put("CurrentViewKey","AllDocuments") 
	sessionScope.put("AllDocuments_SearchKey",searchQuery)
	sessionScope.put("SearchCriteria",strFilter)
	sessionScope.put("HomeDocTab","All");
	sessionScope.put("FilterKeys",null);
	sessionScope.put("ViewProperties",objViewProperties);
}

function searchContactView()
{
	if(getComponent("inputText1").getValue() == compositeData.DefaultFieldText || getComponent("inputText1").getValue()=="")
	{
		return
	}	
	
	var strViewKey = sessionScope.get("CurrentContactViewKey") ||"AllContacts"
	
	var objViewProperties = {"ViewKey":strViewKey}
	objViewProperties.Category = (sessionScope.get("ContactType")==null)?"":sessionScope.get("ContactType")
	objViewProperties.Tag = sessionScope.get("ContactTag")
	objViewProperties.FilterKeys = sessionScope.get("ContactFilterKeys")

	var strFilter = "";
	var searchQuery = "";

	if(objViewProperties.Category != null && objViewProperties.Category != "")
	{
		searchQuery += "[ContactType]=" + objViewProperties.Category
		strFilter = objViewProperties.Category
	}	
	if(objViewProperties.Tag != null)
	{
		searchQuery += (searchQuery=="")?"":" AND "
		strFilter += (strFilter=="")?"":"\\"			
		searchQuery += "[AreaOfExpertise]=" + objViewProperties.Tag 
		strFilter += objViewProperties.Tag
	}	
	searchQuery += (searchQuery=="")?"":" AND "
	searchQuery+=getComponent("inputText1").getValue();
	strFilter += (strFilter=="")?"":"\\"
	strFilter += getComponent("inputText1").getValue()
	
	sessionScope.put("CurrentContactViewKey","AllContacts") 
	sessionScope.put("AllContacts_SearchKey",searchQuery)
	sessionScope.put("SearchCriteria",strFilter)
	sessionScope.put("FilterKeys",null);
	sessionScope.put("ViewProperties",objViewProperties);
}

function clearViewSettings()
{
	sessionScope.put("ViewStartIndex",0)
	sessionScope.put("CurrentDepartmentID",null)
	sessionScope.put("CurrentCategory",null)
	sessionScope.put("CurrentTag",null)
	sessionScope.put("FilterKeys",null)
}

function searchPeople()
{
	if(getComponent("inputText1").getValue() != "" && getComponent("inputText1").getValue() != "Search People")
	{
		viewScope.put("Profile_SearchKey","[FullName]=*" + getComponent("inputText1").getValue() + "*")
	}
	else
	{
		viewScope.put("Profile_SearchKey",null)
	}
}

function getSharedWith(docToGet,fieldToGet,getRealtime)
{
	var strSharedWith = docToGet.getItemValueString(fieldToGet)
	if(strSharedWith == ""){
		return []
	}
	if(getRealtime){
		var dbProfile:NotesDatabase = session.getDatabase("",AppSettings.getFilePath("ProfileDBPath"))
		var viewProfile = dbProfile.getView("vwProfiles")
		var objSharedWith = fromJson(strSharedWith)
		var entryProfile:NotesViewEntry
		for(var i=0;i<objSharedWith.length;i++){
			entryProfile = viewProfile.getEntryByKey(objSharedWith[i].an,true)
			if(entryProfile != null){
				var colVals:java.util.Vector = entryProfile.getColumnValues()
				objSharedWith[i].dn = colVals.get(1)
				objSharedWith[i].dt = colVals.get(2)
				objSharedWith[i].o = colVals.get(3)
			}
		}
		return toJson(objSharedWith)
	}else{
		return strSharedWith
	}
}

function doNameSearch()
{
	viewScope.put("NameSelectTab","resultTab")
	var strName = getComponent("name1").getValue() 
	if(compositeData.NameType == "NAB User")
	{
		strSearchString = "[FullName]=*" + strName + "*" 	
	}


	viewScope.put("NameSelect_SearchKey",strSearchString)
}

function clearNameSelectData()
{
	viewScope.remove("NameSelectTab") 
	viewScope.remove("NameSelectMsg")
	viewScope.remove("NameSelected")
	viewScope.remove("NameSelect_SearchKey")
	getComponent("name1").setValue("")
}
function deleteContact(strParentDocID)
{
	var docProfile:NotesDocument = getDoc(ProfileStoreDB,Member.ProfileDocID)
	var docMember = getDoc(database,Member.MemberDocID)
	var viewMember:NotesView = database.getView("vwMembersBySortOrder");
	var collMembers:NotesViewEntryCollection = viewMember.getAllEntriesByKey(strParentDocID,true)
	var entryToRemove:NotesViewEntry = collMembers.getEntry(docMember);
	var entryMember:NotesViewEntry;
	viewMember.setAutoUpdate(false)
	if(entryToRemove != null)
	{
		if(collMembers.getCount() > 0)
		{
			collMembers.deleteEntry(entryToRemove)
			var iCount = 0;
			entryMember = collMembers.getFirstEntry()
			while(entryMember != null)
			{
				docMember = entryMember.getDocument()
				if(docMember != null)
				{
					docMember.replaceItemValue("SortOrder",iCount)
					docMember.save()
				}
				iCount++;
				entryMember = collMembers.getNextEntry(entryMember)
			}
		}	
		viewMember.setAutoUpdate(true)
		docMember = getDoc(database,Member.MemberDocID)
		if(docMember != null)
		{
			docMember.remove(true)
		}	
	}
}
function moveContact(strWhere)
{
	if(strWhere.toLowerCase()=="up")
	{
		moveTo = memberIndex-1
	}
	else
	{
		moveTo = memberIndex+1
	}
	if(moveTo >=0 && moveTo < teamMembers.size())
	{
		var memberToMove = teamMembers.get(memberIndex)
		var memberToReplace = teamMembers.get(moveTo)
		
		var docToMove:NotesDocument = getDoc(database,memberToMove.MemberDocID)
		var docToReplace:NotesDocument = getDoc(database,memberToReplace.MemberDocID)
		docToMove.replaceItemValue("SortOrder",memberToReplace.SortOrder)
		docToReplace.replaceItemValue("SortOrder",memberToMove.SortOrder)
		docToMove.save()		
		docToReplace.save()
	}	
}

function isArray(obj) 
{
	if (obj.constructor.toString().indexOf("Array") == -1)return false;
	   else return true;
}



function getDepartments()
{
	var arrDepartments = [];
	var docSetup:NotesDocument = database.getView("appSetup").getFirstDocument();
	
	if(docSetup==null)return false;
	if(UserContext.hasDepartments())
	{
		var departments:java.util.HashMap = UserContext.getDepartments()
		var iterator:java.util.Iterator = departments.keySet().iterator();
		var strKey;
		var strValue;
		while( iterator.hasNext() )
		 {  
		 	strKey = iterator.next()
		 	strValue = departments.get(strKey)
		 	if(strValue == docSetup.getItemValueString("DefaultDeptName"))
		 	{
		 		viewScope.put("TheFieldID",strKey)
		 	}
		 	arrDepartments.push(strValue + "|" + strKey)
		}
	}	
	return arrDepartments
}



function setCurrentView(strType)
{
	var strCurrentViewKey = "AllDocuments"
	var strDepartmentID = "";
	var filterKeys:java.util.Vector = new java.util.Vector();	
	sessionScope.put("ViewStartIndex",0)
	sessionScope.put("ViewSwitched",true)
	var pager:com.ibm.xsp.component.xp.XspPager = getComponent("pager3")
	if (pager != null) pager.gotoPage(0)
	
	if(UserContext.hasDepartments())
	{
		strDepartmentID = sessionScope.get("CurrentDepartmentID")
		if(strDepartmentID != "" && strDepartmentID != null)
		{	
			filterKeys.add(strDepartmentID)
			sessionScope.put("CurrentDepartmentID",strDepartmentID)
		}	
		else
		{
			sessionScope.put("CurrentDepartmentID",null)
		}
	}

	switch(strType)
	{
		case "All":
		{
			sessionScope.put("CurrentCategory",null);
			sessionScope.put("CurrentTag",null);
			if(strDepartmentID!="")
			{
				strCurrentViewKey = "AllDocsByDepartment"
			}			
			else
			{
				strCurrentViewKey = "AllDocuments"
			}
			sessionScope.put(strCurrentViewKey + "_Title", "All Documents");
			break;
		}
		case "Tag":
		{
			if(strDepartmentID != ""  && strDepartmentID != null)
			{
				strCurrentViewKey = "DepartmentDocsByTag"
			}
			else
			{
				strCurrentViewKey = "AllDocsByTag"
			}
			filterKeys.add(sessionScope.get("CurrentTag"))
			sessionScope.put(strCurrentViewKey + "_Title", "Tagged \"" + sessionScope.get("CurrentTag") + "\"");
			break;
		}		
		case "CategoryTag":
		{
			if(strDepartmentID != ""  && strDepartmentID != null)
			{
				strCurrentViewKey = "DepartmentDocsByCategoryTags"
			}
			else
			{
				strCurrentViewKey = "AllDocsByCategoryTags"
			}
			filterKeys.add(sessionScope.get("CurrentCategory"))
			filterKeys.add(sessionScope.get("CurrentTag"))
			sessionScope.put(strCurrentViewKey + "_Title", "Tagged \"" + sessionScope.get("CurrentCategory") + "\\" + sessionScope.get("CurrentTag") + "\"");
			break;
		}
		case "Category":
		{
			if(strDepartmentID != "" && strDepartmentID != null)
			{
				strCurrentViewKey = "DepartmentDocsByCategory"
			}
			else
			{
				strCurrentViewKey = "AllDocsByCategory"
			}
			filterKeys.add(sessionScope.get("CurrentCategory"))
			sessionScope.put("CurrentTag",null);
			sessionScope.put(strCurrentViewKey + "_Title", "Categorized under  \"" + sessionScope.get("CurrentCategory") + "\"");
			break;
		}		
	}
	if(!filterKeys.isEmpty())
	{
		sessionScope.put("FilterKeys",filterKeys)	
	}
	else
	{
		sessionScope.put("FilterKeys",null)	
	}
	sessionScope.put("CurrentViewKey",strCurrentViewKey) 
	sessionScope.put(strCurrentViewKey+ "_SearchKey",null);
	var strSearchText = getComponent("inputText1").getValue()
	if(strSearchText != "Search Documents" && strSearchText != "Search Contacts" && strSearchText !="")
	{
		searchView()
	}	
}

function setContactView(strType)
{
	var strCurrentViewKey = "AllContacts"
	var filterKeys:java.util.Vector = new java.util.Vector();	
	sessionScope.put("ViewStartIndex",0)

	switch(strType)
	{
		case "All":
		{
			sessionScope.put("ContactType",null);
			sessionScope.put("ContactTag",null);
			sessionScope.put(strCurrentViewKey + "_Title", "All Contacts");
			break;
		}
		case "Tag":
		{
			strCurrentViewKey = "ContactsByTag"
			filterKeys.add(sessionScope.get("ContactTag"))
			sessionScope.put(strCurrentViewKey + "_Title", "Tagged \"" + sessionScope.get("ContactTag") + "\"");
			break;
		}		
		case "CategoryTag":
		{
			strCurrentViewKey = "ContactsByCategoryTags"
			filterKeys.add(sessionScope.get("ContactType"))
			filterKeys.add(sessionScope.get("ContactTag"))
			sessionScope.put(strCurrentViewKey + "_Title", "Tagged \"" + sessionScope.get("ContactType") + "\\" + sessionScope.get("ContactTag") + "\"");
			break;
		}
		case "Category":
		{
			strCurrentViewKey = "ContactsByType"
			filterKeys.add(sessionScope.get("ContactType"))
			sessionScope.put("ContactTag",null);
			sessionScope.put(strCurrentViewKey + "_Title", "Categorized under  \"" + sessionScope.get("ContactType") + "\"");
			break;
		}		
	}
	if(!filterKeys.isEmpty())
	{
		sessionScope.put("ContactFilterKeys",filterKeys)	
	}
	else
	{
		sessionScope.put("ContactFilterKeys",null)	
	}
	sessionScope.put("CurrentContactViewKey",strCurrentViewKey) 
	sessionScope.put(strCurrentViewKey+ "_SearchKey",null);
	if(getComponent("inputText1").getValue() != "Search Contacts" && getComponent("inputText1").getValue()!="")
	{
		searchView()
	}	
}


function getCurrentView()
{
	if(sessionScope.get("CurrentViewKey") == null)
	{
		sessionScope.put("CurrentViewKey","AllDocuments") 
	}
	return sessionScope.get("CurrentViewKey") 
}

function getCurrentTagView(strScope,strDefault)
{
	strScope = (strScope==null)?"CurrentViewKey":strScope
	strDefault = (strDefault==null)?"AllDocuments":strDefault
	var strViewKey = (sessionScope.get(strScope) == null)?strDefault:sessionScope.get(strScope)
	var objView = AppSettings.getViewDefinitions().get(strViewKey)
	return objView.getTagView()
}

function getTagEntryColumn(strScope,strDefault)
{
	strScope = (strScope==null)?"CurrentViewKey":strScope
	strDefault = (strDefault==null)?"AllDocuments":strDefault			
	var strViewKey = (sessionScope.get(strScope) == null || sessionScope.get(strScope) == "")?strDefault:sessionScope.get(strScope) 
	var objView = AppSettings.getViewDefinitions().get(strViewKey)
	return objView.getTagColumn()
}
function getTagType()
{
	var strViewKey = (sessionScope.get("CurrentViewKey") == null || sessionScope.get("CurrentViewKey") == "")?"AllDocuments":sessionScope.get("CurrentViewKey") 
	var objView = AppSettings.getViewDefinitions().get(strViewKey)
	return objView.getTagType()
}
function setArchiveFlag(flag)
{
	var docMain:NotesDocument = MainTopic.getDocument()
	var responses:NotesDocumentCollection = docMain.getResponses();
	var dt:NotesDateTime = session.createDateTime("Today"); 

	if(responses.getCount() > 0)
	{
		if(flag)
		{	
			responses.stampAll("ExpireDate",dt)
		}	
		else
		{
			var docResponse:NotesDocument = responses.getFirstDocument()
			var tmpDoc:NotesDocument;
			
			while(docResponse != null)
			{
				docResponse.removeItem("ExpireDate")
				docResponse.save(true)
				tmpDoc = responses.getNextDocument()
				docResponse.recycle()
				docResponse = tmpDoc
			}
		}
	}
	if(flag)
	{	
		docMain.replaceItemValue("ExpireDate", dt);
	}
	else
	{
		docMain.removeItem("ExpireDate")
	}
	docMain.save();
	docMain.recycle();
}