/*
test addressbook with more than 100 contacts
update in memory object whitout reload
filter group based on group name
filter group based on contact name
filter group based on contact email
when update contact email show group and ask for update
show address book of delegated account 
hide group panel on start
delete row
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


function walk_folder(obj){
	if (typeof obj.folder =='object' )
		{return [obj, walk_folder(obj.folder[0])]}
	else
		{return obj}
}

var zimbraClient= {
	authToken: "",
 	hostName: "",
	currentGroup: "",
	currentGroupJson: function(){return groupToJson(this.currentGroup)},
	addressBooks:[],
	email_dictionary: {},
	user_contacts: {},
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
		if (typeof obj =="object")
			{
				this.absFolderPath=obj.absFolderPath;
				this.name=obj.name;
				this.id=obj.id;
				this.view=obj.view;
			}
		else
			{this.absFolderPath=obj};

		this.get_json=function(){
			var address_book = this;
			var header='"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ zimbraClient.authToken +'"}}';
        	var body='"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","offset":0,"limit":100,"query":"in:\\"'+ address_book.absFolderPath.substring(1) +'\\"","types":"contact","fetch":1}}'
        	
		    var response = $.post(zimbraClient.hostName +  "/service/soap/SearchRequest", "{" + header + "," + body + "}", function(data,status,context){
		    		if (context.readyState== 4 && context.status==200){
		    			address_book.json_data=data;
		    		}
		    	}, "json");
		};
		this.popolate=function(){
		   this.get_json();
		   var data =  this.json_data;
		   var addressBook = this;
		   if (! ("cn" in data.Body.SearchResponse) )
		   	{return}

		   $.each( data.Body.SearchResponse.cn, function( index,obj ) 
	   		{
		   		if (obj._attrs.type=="group") 
		   			{addressBook.groups.push(obj)}
		   		else
		   		 {
		   		 	email=obj._attrs.email;
		   		 	zimbraClient.user_contacts[obj.id.toString()]=obj;
		   		 	zimbraClient.email_dictionary[email]=obj.id;
		   		 	zimbraClient.user_contacts[obj.id.toString()]["emails"]=[email];
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
	   		});
		}
	},

	getAddressBooks:function(){
      var header='{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
      var body='"Body":{"GetFolderRequest":{"_jsns":"urn:zimbraMail","visible":"0"}}}';
      $.post(this.hostName + "/service/soap/GetFolderRequest", header + "," + body, address_book_to_obj, "json");
   	  
	},
	getAddressBookxxx: function(addressBook){
		//TODO recursive call di getAddressBook in fmore than 1000 result
		groups=[]
        contacts=[]
		var header='"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
        var body='"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","offset":0,"limit":100,"query":"in:\\"'+ addressBook.absFolderPath.substring(1) +'\\"","types":"contact","fetch":1}}'
		
		$.post(this.hostName + "/service/soap/SearchRequest", "{" + header + "," + body + "}",
					function(data){
					   addressBook.groups =  addressBook.groups || []
					   addressBook.contacts =  addressBook.contacts || []

					   $.each( data.Body.SearchResponse.cn, function( index,obj ) 
					   		{
						   		if (obj._attrs.type=="group") 
						   			{addressBook.groups.push(obj)}
						   		else
						   		 {
						   		 	email=obj._attrs.email;
						   		 	zimbraClient.user_contacts[obj.id.toString()]=obj;
						   		 	zimbraClient.email_dictionary[email]=obj.id;
						   		 	zimbraClient.user_contacts[obj.id.toString()]["emails"]=[email];
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
					   		});
			},"json")
		
    //if data.size == limit >> getGroup altri 100
	
	},
	saveGroups: function(id,members){
		var data='{';
		data= data + '"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}},';
		data= data + '"Body":{"ModifyContactRequest":{"_jsns":"urn:zimbraMail","replace":"0","force":"1","cn":{"id":"' + id
		data= data  + '","a":[{"n":"dlist","_content":"' + members;  
		data= data+ '"}]}}}}'
        var response = $.post(this.hostName + "/service/soap/ModifyContactRequest",data);
        console.log(response);
        zimbraClient.getAddressBooks();

	},
	saveContact: function(id,emails){
		var data='{';
		data= data + '"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}},';
		data= data + '"Body":{"ModifyContactRequest":{"_jsns":"urn:zimbraMail","replace":"0","force":"1","cn":{"id":"' + id
		data= data  + '","a":['
		tmp_emails = []
		$.each(emails, function(index,email){
				value = '{"n":"email#index","_content":"#value"}'
				if (index > 0 )
					value = value.replace("#index", index + 1);
				value = value.replace("#index", "");
				value = value.replace("#value", email);
				tmp_emails.push(value);
				})
		data= data  + tmp_emails.join(",");
		data= data  + ']'
		data= data+ '}}}}'
		$.post(this.hostName + "/service/soap/ModifyContactRequest",data, function(data,status,xhr){ zimbraClient.getAddressBooks()}, "json")	
	}
	
}



function address_book_to_obj(address_book){
	var local_folders = $.map(address_book.Body.GetFolderResponse.folder[0].folder, function(n){return walk_folder(n);});
	var delegated_folders = address_book.Body.GetFolderResponse.link && $.map(address_book.Body.GetFolderResponse.link[0], function(n){return walk_folder(n);});
	zimbraClient.addressBooks = [];
	$.each( local_folders, function(index, obj ) {
		obj.view=="contact" ? zimbraClient.addressBooks.push(new zimbraClient.addressBook(obj)) : null;

	});
	$.each( zimbraClient.addressBooks, function(index, obj ) {
		obj.popolate();
	});
}



function groupToJson(dlist){
		dlist=dlist.replace(/"/, "");
		var emails=[]
		match=REGEXP_EMAILS.exec(dlist);
		var counter = 0

		while (match != null) {
			contact=REGEXP_EMAIL.exec(match[0]);
			email={"DT_RowId": "contact_row_" + counter++, "contact_id" : zimbraClient.isContact(contact[2]) +"", "contact" : contact[1] || "", "email" : contact[2], "original" : contact[0], "link":"0" };
			emails.push(email);
    	    match = REGEXP_EMAILS.exec(zimbraClient.currentGroup);
		}
		return emails
		
		
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


function generateUlForAddressBook(address_book){
  var li=$('<li/>', 
        { 'id': 'address_book_li_' + address_book.id, 
          'class':' list-group-item list-group-item-success ',
          'data-id':address_book.id , 'data-targetid': 'address_book_ul_' + address_book.id , 
          'data-folderpath': address_book.absFolderPath
        }
        ).append($('<label/>', {'class':' tree-toggler nav-header',  'text': 'Rubrica ' + address_book.name})
        ).append($('<ul/>', {'class':'nav nav-list tree', 'id': 'address_book_ul_' + address_book.id}));
  return li;
}

function generateLIForGroup(group){
    var li = $('<li/>', {
			'id': group.id,
			'class':' li_group', 
			'text': group.fileAsStr,
			'data-id':group.id ,
			'data-groupname': group.fileAsStr, 
			'data-dlist':group._attrs.dlist}
		);
    li.click(function(){
    	$(".panel-group").show();
		zimbraClient.currentGroup=$(this).data("dlist");

        var table=$('#contacts_table').DataTable();
        table.clear();
        table.rows.add(zimbraClient.currentGroupJson()).draw();

        var group_label=$("#label_group_name")
        group_label.data("id", $(this).data("id"));
        group_label.empty()
        group_label.append($(this).data("groupname"));
        //makeTableEditable()
        
    })
  return li;
};

    

function makeTableEditable(){
 $('#contacts_table tr.editable td.editable').editable(function(value, settings) {
    var table=$('#contacts_table').DataTable();
    //$(".panel-contact").hide();
    table.cell(this).data(value).draw();
    return(value);
      }, {
      type    : 'text',
      submit  : 'OK',
      onblur  : 'submit',
      //click   : function(){$(".panel-contact").hide()},
      event   : "click",
      style   : "inherit"
  });
 $('#contacts_table tr.contact td.editable.email').editable(function(value, settings) {
      //$(".panel-contact").hide();
      var table=$('#contacts_table').DataTable();
      table.cell(this).data(value).draw();
      return(value);
      },
    {
      type: 'select',
      onblur  : 'submit',
      //click   : function(){$(".panel-contact").hide()},
      submit  : 'OK',
      "data": function(value, settings) {
            var dt_data= contacts_table.row($(this).parent()).data();
            var array={}
            $.each(zimbraClient.user_contacts[dt_data.contact_id]["emails"],
                           function(index,value){ array[value]=value});
            return array;
          }

  });

  
  $('#contacts_table tr.contact td.contact').click(function() {
    var dt_data= contacts_table.row($(this).parent()).data();
    editContact(dt_data["contact_id"]);
  });

};

function deleteRow(row){
	var table=$('#contacts_table').DataTable();
	table.row(row.parents('tr')).remove().draw();
};

function editContact(id){
	var contact_panel=$(".panel-contact");
	$(".new_email_line").remove();
	contact_panel.show();
	$(".panel-group").hide();
	var contact= zimbraClient.user_contacts[id];
	$("#contactName").val(contact.fileAsStr);
	$("#contactName").data("id", id);
	email=contact._attrs.email;
	new_line=$(".contact_template").clone()
	new_line.removeClass("contact_template").addClass("new_email_line").find(".email").prop({ id: email, name: "email"}).addClass("active").val(email);

	$(".panel-contact-body").append(new_line);


	var counter=2;
	while (email!=null)
	  {
	        email=null;
	        if ('email'+counter in contact._attrs)
	          {
	            email=contact._attrs["email"+counter];
	            new_line=$(".contact_template").clone()
	            new_line.removeClass("contact_template").addClass("new_email_line").find(".email").prop({ id: email, name: "email"}).addClass("active").val(email);
				$(".panel-contact-body").append(new_line);
	            counter++
	          }
	  }
	  $(".new_email_line").show();
}




