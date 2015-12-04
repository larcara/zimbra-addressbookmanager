var authToken;
var contacts=[];
var address_books=[];
var groups=[];
var hostName="";

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
		//console.log(addressBook );
		//console.log("get groups and contacts for ..");
		groups=[]
        contacts=[]
		var header='"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ this.authToken +'"}}';
        var body='"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","offset":0,"limit":100,"query":"in:\\"'+ addressBook.absFolderPath.substring(1) +'\\"","types":"contact","fetch":1}}'
		
		var getAddressBookFunction =  $.when($.post(this.hostName + "/service/soap/SearchRequest", "{" + header + "," + body + "}",
					function(data){
					   console.log(addressBook);
					   addressBook.groups =  addressBook.groups || []
					   addressBook.contacts =  addressBook.contacts || []
					   $.each( data.Body.SearchResponse.cn, function( index,obj ) {obj._attrs.type=="group" ? addressBook.groups.push(obj) : addressBook.contacts.push(obj);})
			},"json"))
		return getAddressBookFunction;
    //if data.size == limit >> getGroup altri 100
	
	}

	
}

function setGroups(id, dlist){
    data='{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ authToken +'"}},"Body":{"ModifyContactRequest":{"_jsns":"urn:zimbraMail","replace":"0","force":"1","cn":{"id":"' + id + '","a":[{"n":"dlist","_content":"' + dlist  + '"}]}}}}'
      $.post(hostName + "/service/soap/ModifyContactRequest",data, function(data,status,xhr){ getGroups()}, "json")
};

function popolateGroups(parent_element){
    console.log(parent_element);
    var group_li=$("#"+ parent_element.data('targetid'))
    group_li.empty();
    $.each(groups,function(index, value){
        group_li.append($('<li/>', {'id': value.id, 'class':'li_group', 'text': value.fileAsStr, 'data-id':value.id , 'data-groupname': value.fileAsStr, 'data-dlist':value._attrs.dlist})
        )
    })
    
    $(".li_group").click(function(){
        console.log($(this).data("dlist"));
        var emails=$(this).data("dlist").split(/((?:\"[^\"]*\" )?<?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>?)/);
        var group_label=$("#label_group_name")
        var table=$('#contacts_table').DataTable();
        table.clear();
        $.each(emails, function(index,value){table.row.add([null,$('<label/>',{'data-originalvalue':value, 'text':value})[0].outerHTML,null])});
        table.draw();
        group_label.data("id", $(this).data("id"));
        group_label.empty()
        group_label.append($(this).data("groupname"));

        //alert($(this).data("dlist"));
        //var group_textarea=$("#group_elements");
        //$("#group_name").html($(this).data("groupname"));
        //$("#group_name").data("id",$(this).data("id"));
        //group_textarea.val($(this).data("dlist"));
    })
}

function popolateAddressBooks(){
	   //console.log(zimbraClient.addressBooks);
    var group_div=$(".address_books_ul")
    group_div.empty();
    $.each(zimbraClient.addressBooks,function(index, value){
		console.log(value);
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
function saveGroups(id,dlist){
    setGroups(id,dlist)
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
	console.log(group);
    var li = $('<li/>', {
			'id': group.id,
			'class':' li_group', 
			'text': group.fileAsStr,
			'data-id':group.id ,
			'data-groupname': group.fileAsStr, 
			'data-dlist':group._attrs.dlist}
		);
    li.click(function(){
        //console.log($(this).data("dlist"));
        var emails=$(this).data("dlist").split(/((?:\"[^\"]*\" )?<?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>?)/);
        var group_label=$("#label_group_name")
        var table=$('#contacts_table').DataTable();
        table.clear();
        $.each(emails, function(index,value){
            if (value.indexOf("@") > 0)
              table.row.add([null,$('<label/>',{class:'table-cell', 'data-originalvalue':value, 'text':value})[0].outerHTML,null])
          });
        table.draw();
        group_label.data("id", $(this).data("id"));
        group_label.empty()
        group_label.append($(this).data("groupname"));
        $(".table-cell").click(function(){
                var newvalue=prompt("Modifica Email", $(this).text());
                console.log (newvalue);
                if (newvalue != "")
                  {
                    //$(this).empty();
                    $(this).text(newvalue);

                  }
              })
    })
  return li;
}