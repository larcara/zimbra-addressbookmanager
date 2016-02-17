/*
test addressbook with more than 100 contacts
update in memory object whitout reload
filter group based on group name
filter group based on contact name
filter group based on contact email
when update contact email show group and ask for update
show address book of delegated account 
*/

var authToken;
var contacts=[];
var address_books=[];
var groups=[];
var hostName="";
var REGEXP_EMAILS=/((?:[\w|,|\s]* )?<?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>?,?)/g
var REGEXP_EMAIL=/([\w|,|\s]* )?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/
var htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

// Regex containing the keys listed immediately above.
var htmlEscaper = /[&<>"'\/]/g;


var contacts_table; 

var xhttp;
if (window.XMLHttpRequest) {
    xhttp = new XMLHttpRequest();
    } else {
    // code for IE6, IE5
    xhttp = new ActiveXObject("Microsoft.XMLHTTP");
}

$.ajaxSetup({
 async: false
});

// Escape a string for HTML interpolation.
_.escape = function(string) {
  return ('' + string).replace(htmlEscaper, function(match) {
    return htmlEscapes[match];
  });
};


function walk_folder(obj, debug){
	var return_obj=null;
	if (debug==true)
		{
		// console.log("starting walk on:");
		// console.log(obj);
		}
	if (typeof obj.folder =='object' )
		{
			return_obj = [obj];
			$.each(obj.folder,function(counter,item){
				//console.log(item);
				//console.log(counter);
				//console.log(return_obj);
				return_obj.push(walk_folder(item));
			})
		//	return [obj, walk_folder(obj.folder[0])]
		}
	else
		{return_obj = obj}
	return return_obj
}

var zimbraClient= {
	authToken: "",
 	hostName: "",
	//currentGroup: "",
	//currentGroupJson: function(){return groupToJson(this.currentGroup)},
	addressBooks:[],
	email_dictionary: {},
	user_contacts: {},
	groups: {},
	isConnected: function() {return !this.authToken=="";},
	user:"",
	password:"",
	isContact: function(contact_email){
			if (contact_email in this.email_dictionary)
				return this.email_dictionary[contact_email]
			else
				return ""
	},
	getAuth:function(){
		if (this.isConnected()) return true;
		data=$.post(this.hostName + "/service/soap/AuthRequest",
				'{"Header":{"context":{"_jsns":"urn:zimbra","format":{"type":"js"},"nosession":{}}},"Body":{"AuthRequest":{"_jsns":"urn:zimbraAccount","account":{"_content":"' + this.user + '","by":"name"},"password":{"_content":"' + this.password + '"},"prefs":{},"attrs":{}}}}',
				function(data){
					zimbraClient.authToken=data.Body.AuthResponse.authToken[0]._content; 
					var new_query="" + jQuery.query.set("authToken", zimbraClient.authToken).set("hostName", zimbraClient.hostName);
					window.location.search =  new_query;
				},
				"json");
		
	},
	addressBook:function(obj){
		this.groups=[];
		this.contacts=[];
		this.absFolderPath="";
		this.name="";
		this.owner="";
		if (typeof obj =="object")
			{
				this.absFolderPath=obj.absFolderPath;
				this.name=obj.name;
				this.id=obj.id;
				this.view=obj.view;
				this.owner=obj.owner;
			}
		else
			{this.absFolderPath=obj};

		this.get_json=function(offset,limit){
			var address_book = this;
			var header='"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ zimbraClient.authToken +'"}}';
        	var body='"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","offset":' + offset +',"limit":' + limit +',"query":"in:\\"'+ address_book.absFolderPath.substring(1) +'\\"","types":"contact","fetch":1}}'
        	//console.log("starting downloading " + body);

		    var response = $.post(zimbraClient.hostName +  "/service/soap/SearchRequest", "{" + header + "," + body + "}", function(data,status,context){
		    		if (context.readyState== 4 && context.status==200){
		    			address_book.json_data=data;
		    		}
		    	}, "json");
		};
		this.popolate=function(){
		   this.json_data=null;
		   var offset=0
		   this.get_json(offset,offset+1000);
		   while (this.json_data!=null)
		   {

			   var data =  this.json_data;
			   var addressBook = this;
			   if (! ("cn" in data.Body.SearchResponse) )
			   	{break}

			   $.each( data.Body.SearchResponse.cn, function( index,obj ) 
		   		{
			   		if ('dlist' in obj._attrs) 
			   			{
			   				//obj.json_dlist=groupToJson(obj._attrs.dlist);
			   				addressBook.groups.push(obj);
			   			}
			   		else if ('email' in obj._attrs) 
			   		 {
			   		 	email=obj._attrs.email.toLowerCase();

			   		 	zimbraClient.user_contacts[obj.id.toString()]=obj;
			   		 	zimbraClient.user_contacts[obj.id.toString()].owner=addressBook.owner;
			   		 	if (email in zimbraClient.email_dictionary)
			   		 	  {console.log("[" + addressBook.absFolderPath + "] " + email + " è duplicato");}
			   		 	zimbraClient.email_dictionary[email]=obj.id;
			   		 	zimbraClient.user_contacts[obj.id.toString()]["emails"]=[email];
			   		 	zimbraClient.user_contacts[obj.id.toString()]["groups"]={};
			   		 	var counter=2;
			   		 	while (email!=null)
			   		 	{
							if ('email'+counter in obj._attrs)
								{
									email=obj._attrs["email"+counter];
									zimbraClient.email_dictionary[email]=obj.id;
									zimbraClient.user_contacts[obj.id.toString()]["emails"].push(email);
									counter++
								}
								else
								break

			   		 	}
			   		 	addressBook.contacts.push(obj)
			   		 }
			   		 else
			   		 {
			   		 	//console.log("ERRORE")
			   		 	//console.log(obj)
			   		 }
		   		});
				this.json_data=null;
				offset = offset + 1000;
 				this.get_json(offset,offset+100);
			};
			if (addressBook ) {
			   $.each(addressBook.groups, function(index,obj){
			   		emails=groupToJson(obj._attrs.dlist);
			   		obj.dlist_json=emails;
			   		zimbraClient.groups[obj.id]=obj;
			   		$.each(emails, function(index,contact){
			   			if (contact.contact_id != "" && zimbraClient.user_contacts[contact.contact_id])
			   			{
			   				if (zimbraClient.user_contacts[contact.contact_id].groups[contact.email] == undefined)
			   					{zimbraClient.user_contacts[contact.contact_id].groups[contact.email]=[]}
			   				zimbraClient.user_contacts[contact.contact_id].groups[contact.email].push(obj)	
			   			}
			   		}); 
			   });
		   }

		}
	},

	getAddressBooks:function(){
      var header='{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
      var body='"Body":{"GetFolderRequest":{"_jsns":"urn:zimbraMail","visible":"0"}}}';
      zimbraClient.addressBooks = [];
      $.post(this.hostName + "/service/soap/GetFolderRequest", header + "," + body, address_book_to_obj, "json");



   	  $.each( zimbraClient.addressBooks, function(index, obj ) {
   	  	//console.log("starting elaborate ");
   	  	//console.log(obj);
		obj.popolate();
	  });

	},
	
	saveGroups: function(id,members){
		var data='{';
		data= data + '"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}},';
		data= data + '"Body":{"ModifyContactRequest":{"_jsns":"urn:zimbraMail","replace":"0","force":"1","cn":{"id":"' + id
		data= data  + '","a":[{"n":"dlist","_content":"' + members;  
		data= data+ '"}]}}}}'
        var response = $.post(this.hostName + "/service/soap/ModifyContactRequest",data);
        
        zimbraClient.getAddressBooks();
        popolateAddressBooks();

	},
	saveContact: function(id,email_field,value){
		cmd = '{"n":"email#index","_content":"#value"}'.replace("email#index", email_field).replace("#value", value);
		var data='{';
		data= data + '"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}},';
		data= data + '"Body":{"ModifyContactRequest":{"_jsns":"urn:zimbraMail","replace":"0","force":"1","cn":{"id":"' + id
		data= data  + '","a":[' + cmd  + ']'
		data= data+ '}}}}'
		$.post(this.hostName + "/service/soap/ModifyContactRequest",data);
		zimbraClient.getAddressBooks()
		popolateAddressBooks()
	}
	
}



function address_book_to_obj(address_book, debug){
	
	var local_folders = address_book.Body.GetFolderResponse.folder ? $.map(address_book.Body.GetFolderResponse.folder[0].folder, function(n){return walk_folder(n);}) : [];
	var remote_mount_point;
	var delegated_folders;

	if (address_book.Body.GetFolderResponse.link)
		{
		 remote_mount_point= address_book.Body.GetFolderResponse.link;
		 delegated_folders = remote_mount_point && $.map(remote_mount_point[0].folder, function(n){return walk_folder(n,true);})
		}
		else
		{
		 remote_mount_point= address_book.Body.GetFolderResponse.folder[0].link;
		 delegated_folders = remote_mount_point && $.map(remote_mount_point, function(n){return walk_folder(n,true);});
	 	}

	

	if (debug==true)
	{
		console.log(address_book);
		console.log(local_folders);
		console.log(delegated_folders);
	}

	//zimbraClient.addressBooks = [];
	$.each( local_folders, function(index, obj ) {
		obj.view=="contact" ? zimbraClient.addressBooks.push(new zimbraClient.addressBook(obj)) : null;
	});

	$.each( delegated_folders, function(index, obj ) {
		obj.view=="contact" ? zimbraClient.addressBooks.push(new zimbraClient.addressBook(obj)) : null;
		if (obj.rid=="1")
			{
				//console.log ("Starting traverse");
				//console.log (obj);
			var header='{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ zimbraClient.authToken +'"}}';
      		var body='"Body":{"GetFolderRequest":{"_jsns":"urn:zimbraMail","visible":"0", "folder":{"path":"' + obj.absFolderPath +  '"}}}}';
      		//var body='"Body":{"GetFolderRequest":{"_jsns":"urn:zimbraMail","visible":"0", "folder":{"path":"/Zfunz-Sistemisti Posta"}}}}';
      		$.post(zimbraClient.hostName + "/service/soap/GetFolderRequest", header + "," + body, function(data){address_book_to_obj(data,false)}, "json");

			}
			

	});
	
	
}



function groupToJson(_dlist, debug){
		var dlist=_dlist.replace(/"/g, "");
		var emails=[]
		match=REGEXP_EMAILS.exec(dlist);
		var counter = 0

		while (match != null) {
			if (debug)
			  {console.log(match)}
			contact=REGEXP_EMAIL.exec(match[0]);
			email={"DT_RowId": "contact_row_" + counter++, "contact_id" : zimbraClient.isContact(contact[2]) +"", "contact" : contact[1] || "", "email" : contact[2], "original" : contact[0], "link":"0" };
			emails.push(email);
    	    match = REGEXP_EMAILS.exec(dlist);
		}
		return emails
		
		
}

function jsonToGroup(_dlist, debug){
		var new_dlist=$.map(_dlist,function(value){return value["contact"] + " <" + value["email"] + ">"});
		return new_dlist.join(",")
		
		
}



function popolateAddressBooks(){
    var group_div=$(".address_books_ul")
    group_div.empty();
    $.each(zimbraClient.addressBooks,function(index, value){
		if (value.groups.length > 0 )
			{
				var addressBook_ul=generateUlForAddressBook(value);
        		group_div.append(addressBook_ul);
				$.each(value.groups,function(index, value){
						var group_li=generateLIForGroup(value);
						addressBook_ul.append(group_li);
					})
			}
    })
}





