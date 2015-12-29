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

$(document).ready(function() {
	chrome.storage.sync.get({
        server: "",
      }, function(items) {
        zimbraClient.hostName  = items.server;
        chrome.cookies.get({url: items.server, name:"ZM_AUTH_TOKEN"}, function(cookie){zimbraClient.authToken=cookie.value});
      });

   $(".contact_template").hide();
   $(".panel-contact").hide();
   contacts_table = $('#contacts_table').DataTable({
      //select: true,
      columns: [
          {data:"contact_id",orderable:false},
          {data:"contact", className:"contact editable"},
          {data:"email", className:"email editable"},
          {data:"original"},
          // { "fnRender": function (oObj) {
          //      return '<a href=/cgi/empdetails.php?showemp=' + oObj.aData[0] + '>' + 'More' + '</a>';
          //    }
          // }
          {data:"link","fnCreatedCell": function (nTd, sData, oData, iRow, iCol) {
            $(nTd).html("<span class='glyphicon glyphicon-trash' aria-hidden='true' onClick='deleteRow($(this))'></span>");
           }}  
        ],
        buttons: ['excel',
                  'print',
                  { text: 'Add new',
                      action: function ( e, dt, node, config ) {
                          dt.row.add( {"DT_RowId":null, "contact_id" : "", "contact" : "--", "email" : "--", "original" : "", "link":"0" } ).draw( false );
                          makeTableEditable();}
                  }
         ],
        "createdRow": function( row, data, dataIndex ) {
          console.log (data);
         if ( data["contact_id"] == "" ) 
            { $(row).addClass( 'editable' ); }
          else
            { $(row).addClass( 'contact' );} 
        },
        "columnDefs":[
          {"targets":0, "searchable":false, "visible":false},
          {"targets":3, "searchable":false, "visible":false}
        ]

  });

  contacts_table.buttons().container().appendTo( $('.col-sm-6:eq(0)', contacts_table.table().container() ) );
  zimbraClient.getAuth()
  $(".search_box").show();
  
    $("#reload_groups").click(function(){
        var addressBooks = zimbraClient.getAddressBooks();
        zimbraClient.getAddressBooks();
        popolateAddressBooks()
      });
        
    $(".saveGroups").click(function(){
        console.log("start saving group of:" + $("#label_group_name").data("id"));
        var table=$('#contacts_table').DataTable();
        var new_dlist=$.map(table.data(),function(value){return value["contact"] + " <" + value["email"] + ">"});
        console.log("values:" +  new_dlist);
        zimbraClient.saveGroups($("#label_group_name").data("id"),new_dlist);
    }); 
    $(".saveContact").click(function(){
        contact_id=$("#contactName").data("id");
        form_emails=$(".email.active").map(function(){return $(this).val()});
        console.log("start saving contact :" + contact_id);
        console.log("start saving emails :" + form_emails);
        zimbraClient.saveContact(contact_id,form_emails);
    }); 

 
  }); 


// Escape a string for HTML interpolation.
_.escape = function(string) {
  return ('' + string).replace(htmlEscaper, function(match) {
    return htmlEscapes[match];
  });
};


function walk_folder(obj){
    //console.log ("walkin on " + JSON.stringify(obj));
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
		//TODO: to refactor. create a dictionry email -> contact to improve search
			if (contact_email in this.email_dictionary)
				return this.email_dictionary[contact_email]
			else
				return ""
			/*
			var contacts_founded=$.map(this.addressBooks,
								 function(obj){
 								 		var x= $.map(obj.contacts,
								 					function(contact){
								 						if (contact._attrs.email == contact_email)
								 							return contact ;
								 					}
								 				);
								 		return x;

								  }
							);
			return contacts_founded;
			*/
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
	getAddressBooks:function(){
      var header='{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
      var body='"Body":{"GetFolderRequest":{"_jsns":"urn:zimbraMail","visible":"0"}}}';
      $.when($.post(this.hostName + "/service/soap/GetFolderRequest", header + "," + body, 
                function(data){ 
					//console.log(data.Body.GetFolderResponse.folder[0].folder);
					var local_folders = $.map(data.Body.GetFolderResponse.folder[0].folder, function(n){return walk_folder(n);});
					//console.log(local_folders);
					var delegated_folders = data.Body.GetFolderResponse.link && $.map(data.Body.GetFolderResponse.link[0], function(n){return walk_folder(n);});
					//console.log(delegated_folders);
					zimbraClient.addressBooks = $.map( local_folders, function( obj ) {return obj.view=="contact" ? obj : null;});
					//$.each(zimbraClient.addressBooks, function(index, value){zimbraClient.getAddressBook(value)})
				}, "json")).then(function(){$.each(zimbraClient.addressBooks, function(index, value){zimbraClient.getAddressBook(value)})});

	},
	getAddressBook: function(addressBook){
		//TODO recursive call di getAddressBook in fmore than 1000 result
		groups=[]
        contacts=[]
		var header='"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
        var body='"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","offset":0,"limit":100,"query":"in:\\"'+ addressBook.absFolderPath.substring(1) +'\\"","types":"contact","fetch":1}}'
		
		var getAddressBookFunction =  $.when($.post(this.hostName + "/service/soap/SearchRequest", "{" + header + "," + body + "}",
					function(data){
					   //console.log(addressBook);
					   addressBook.groups =  addressBook.groups || []
					   addressBook.contacts =  addressBook.contacts || []

					   $.each( data.Body.SearchResponse.cn, function( index,obj ) 
					   		{
						   		if (obj._attrs.type=="group") 
						   			{addressBook.groups.push(obj)}
						   		else
						   		 {
						   		 	//TODO... if a contact have more tha one email: 
						   		 	/*
						   		 	_attrs: Object
										email: "larcara@gmail.com"
										email2: "l.arcara@gmail.com"
										email3: "larcara+1@gmail.com"
										firstName: "Luca"
										fullName: "A, Luca"
										lastName: "A"
						   		 	*/
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
			},"json"))
		return getAddressBookFunction;
    //if data.size == limit >> getGroup altri 100
	
	},
	saveGroups: function(id,members){
		var data='{';
		data= data + '"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}},';
		data= data + '"Body":{"ModifyContactRequest":{"_jsns":"urn:zimbraMail","replace":"0","force":"1","cn":{"id":"' + id
		data= data  + '","a":[{"n":"dlist","_content":"' + members;  
		data= data+ '"}]}}}}'
      $.post(this.hostName + "/service/soap/ModifyContactRequest",data, function(data,status,xhr){ zimbraClient.getAddressBooks()}, "json")	
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
		console.log (tmp_emails)
		data= data  + tmp_emails.join(",");
		data= data  + ']'
		data= data+ '}}}}'
		//console.log (this.hostName + "/service/soap/ModifyContactRequest",data, function(data,status,xhr){ zimbraClient.getAddressBooks()}, "json")	
		$.post(this.hostName + "/service/soap/ModifyContactRequest",data, function(data,status,xhr){ zimbraClient.getAddressBooks()}, "json")	
	}
	
}




function groupToJson(dlist){
	    //console.log(dlist);
		dlist=dlist.replace(/"/, "");
		var emails=[]
		match=REGEXP_EMAILS.exec(dlist);
		var counter = 0

		while (match != null) {
			//console.log(match[0]);
			contact=REGEXP_EMAIL.exec(match[0]);


			email={"DT_RowId": "contact_row_" + counter++, "contact_id" : zimbraClient.isContact(contact[2]) +"", "contact" : contact[1] || "", "email" : contact[2], "original" : contact[0], "link":"0" };
			//console.log(email);
			emails.push(email);
    	    match = REGEXP_EMAILS.exec(zimbraClient.currentGroup);
		}
		return emails
		
		
}



function popolateAddressBooks(){
	   //console.log(zimbraClient.addressBooks);
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



//////////////
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
	//console.log(group);
    var li = $('<li/>', {
			'id': group.id,
			'class':' li_group', 
			'text': group.fileAsStr,
			'data-id':group.id ,
			'data-groupname': group.fileAsStr, 
			'data-dlist':group._attrs.dlist}
		);
    li.click(function(){
		zimbraClient.currentGroup=$(this).data("dlist");

        var table=$('#contacts_table').DataTable();
        table.clear();
        table.rows.add(zimbraClient.currentGroupJson()).draw();

        var group_label=$("#label_group_name")
        group_label.data("id", $(this).data("id"));
        group_label.empty()
        group_label.append($(this).data("groupname"));
        makeTableEditable()
        
    })
  return li;
};

    

function makeTableEditable(){
 $('#contacts_table tr.editable td.editable').editable(function(value, settings) {
    var table=$('#contacts_table').DataTable();
    $(".panel-contact").hide();
    table.cell(this).data(value).draw();
    return(value);
      }, {
      type    : 'text',
      submit  : 'OK',
      event     : "click",
      style  : "inherit"
  });
 $('#contacts_table tr.contact td.editable.email').editable(function(value, settings) {
      $(".panel-contact").hide();
      var table=$('#contacts_table').DataTable();
      table.cell(this).data(value).draw();
      return(value);
      },
    {
      type: 'select',
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
    console.log(dt_data["contact_id"]);
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
var contact= zimbraClient.user_contacts[id];
$("#contactName").val(contact.fileAsStr);
$("#contactName").data("id", id);
email=contact._attrs.email;
new_line=$(".contact_template").clone()
new_line.removeClass("contact_template").addClass("new_email_line").find(".email").prop({ id: email, name: "email"}).addClass("active").val(email);

contact_panel.append(new_line);


var counter=2;
while (email!=null)
  {
        email=null;
        if ('email'+counter in contact._attrs)
          {
            email=contact._attrs["email"+counter];
            new_line=$(".contact_template").clone()
            new_line.removeClass("contact_template").addClass("new_email_line").find(".email").prop({ id: email, name: "email"}).addClass("active").val(email);
            contact_panel.append(new_line);
            counter++
          }
  }
  $(".new_email_line").show();
  
}



