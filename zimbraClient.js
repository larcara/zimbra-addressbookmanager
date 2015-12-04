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
	authToken: jQuery.query.get('authToken'),
	hostName: jQuery.query.get('hostName'),
	currentGroup: "",
	currentGroupJson: function(){return groupToJson(this.currentGroup)},
	addressBooks:[],
	isConnected: function() {return !this.authToken=="";},
	user:"",
	password:"",
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
		groups=[]
        contacts=[]
		var header='"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
        var body='"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","offset":0,"limit":100,"query":"in:\\"'+ addressBook.absFolderPath.substring(1) +'\\"","types":"contact","fetch":1}}'
		
		var getAddressBookFunction =  $.when($.post(this.hostName + "/service/soap/SearchRequest", "{" + header + "," + body + "}",
					function(data){
					   //console.log(addressBook);
					   addressBook.groups =  addressBook.groups || []
					   addressBook.contacts =  addressBook.contacts || []
					   $.each( data.Body.SearchResponse.cn, function( index,obj ) {obj._attrs.type=="group" ? addressBook.groups.push(obj) : addressBook.contacts.push(obj);})
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
			email={"DT_RowId":counter++, "contact" : contact[1] || "", "email" : contact[2], "original" : contact[0] };
			//console.log(email);
			emails.push(email);
    	    match = REGEXP_EMAILS.exec(zimbraClient.currentGroup);
		}
		return emails
		
		/*
		var emails=dlist.split(REGEXP_EMAILS);
		var response={
			"draw" : 1,
			"recordsTotal" : emails.length,
			"data": $.map(emails, function(value,index){
					record = {
						"DT_RowId": index,
						"contatto": value,
						"email": value,
						"original" : value
					}
					return record;
				})
			
		};
		
		//return response;
		//console.log(emails);
		var response = $.map(emails, function(value,index){
					console.log(value);
					if (value.indexOf("@")> 0 )
					{
						console.log(value);
						record = {
							"DT_RowId": index,
							"contatto": value,
							"email": value,
							"original" : value
						}
						return record;
					}
				})
			
		
		return response;
		*/
}



function popolateAddressBooks(){
	   //console.log(zimbraClient.addressBooks);
    var group_div=$(".address_books_ul")
    group_div.empty();
    $.each(zimbraClient.addressBooks,function(index, value){
		//console.log(value);
		var addressBook_ul=generateUlForAddressBook(value);
        group_div.append(addressBook_ul);
		$.each(value.groups,function(index, value){
			var group_li=generateLIForGroup(value);
			addressBook_ul.append(group_li);
		})
    })
    $('label.tree-toggler').click(function () {
        //$(this).parent().children('ul.tree').toggle(300);
      });

    $(".address_book_li").click(function(){
        //getGroups($(this).data("folderpath").substring(1), $(this));
//        $(this).children('ul.tree').toggle(300);
    });
    
}



//////////////
function generateUlForAddressBook(address_book){
  var li=$('<li/>', 
        { 'id': 'address_book_li_' + address_book.id, 
          'class':' list-group-item list-group-item-success ',
          'data-id':address_book.id , 'data-targetid': 'address_book_ul_' + address_book.id , 
          'data-folderpath': address_book.absFolderPath
        }
        ).append($('<label/>', {'class':' tree-toggler nav-header',  'text': address_book.name})
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
        //console.log(zimbraClient.currentGroup);
        //var emails=$(this).data("dlist").split(/((?:\"[^\"]*\" )?<?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>?)/);
        var table=$('#contacts_table').DataTable();
        table.clear();
        table.rows.add(zimbraClient.currentGroupJson()).draw();
        /*
        var table=$('#contacts_table').DataTable();
        table.clear();
        $.each(emails, function(index,value){
            if (value.indexOf("@") > 0)
              table.row.add([index, value, value]);
          });
        table.draw();
        */
        var group_label=$("#label_group_name")
        group_label.data("id", $(this).data("id"));
        group_label.empty()
        group_label.append($(this).data("groupname"));
        makeTableEditable()
        //$(".table-cell").click(function(){
        //        var newvalue=prompt("Modifica Email", $(this).text());
        //        console.log (newvalue);
        //        if (newvalue != "")
        //          {
        //            //$(this).empty();
        //            $(this).text(newvalue);
		//
  		//          }
        //      })
    })
  return li;
};

function makeTableEditable(){
	 $('#contacts_table tr td.editable').editable(function(value, settings) {
	 	//console.log(this);
     	//console.log(value);
     	//console.log(settings);
     	var table=$('#contacts_table').DataTable();
     	table.cell(this).data(value).draw();
     	return(value);
  			}, {
     		//type    : 'textarea',
     		submit  : 'OK',
     		tooltip   : 'Click to edit...',
     		event     : "click",
      		style  : "inherit"
 		});
};
