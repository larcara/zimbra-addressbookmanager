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



function setAuthToken(data,status,xhr){
        console.log(data);
        authToken=data.Body.AuthResponse.authToken[0]._content;     
}



function setContacts(data,status,xhr){
   $.each( data.Body.SearchResponse.cn, function( index,obj ) {
    obj._attrs.type=="group" ? groups.push(obj) : contacts.push(obj);
    });
  //contacts += $.map( data.Body.SearchResponse.cn, function( obj ) {
  //  return obj._attrs.type=="group" ? null: obj;
  //  });
  // popolateGroups();
  // console.log(data); 
}

function walk_folder(obj){
    //console.log ("walkin on " + JSON.stringify(obj));
 if (typeof obj.folder =='object' ){
    return [obj, walk_folder(obj.folder[0])]
 }
 else
 {
    return obj
 }
}

function setFolders(data,status,xhr){
    var response=data.Body.GetFolderResponse.folder[0];
    var folders=$.map( response.folder, function(n){
        return walk_folder(n);
    });
    var link=response.link;
    address_books=$.map( folders, function( obj ) {
    return obj.view=="contact" ? obj : null;
    });
 
   popolateAddressBooks();
   console.log(data); 
   
}


function getAuth(host,user, password, callback){
	hostName=host;
    $.post(hostName + "/service/soap/AuthRequest",'{"Header":{"context":{"_jsns":"urn:zimbra","format":{"type":"js"},"nosession":{}}},"Body":{"AuthRequest":{"_jsns":"urn:zimbraAccount","account":{"_content":"' + user + '","by":"name"},"password":{"_content":"' + password + '"},"prefs":{},"attrs":{}}}}',function(data,status,xhr){ setAuthToken(data,status,xhr);callback()}, "json");
};

function getGroups(address_book, parent_element){
    groups=[]
    contacts=[]
    $.post(hostName + "/service/soap/SearchRequest",
        '{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ authToken +'"}},"Body":{"SearchRequest":{"_jsns":"urn:zimbraMail","sortBy":"nameAsc","tz":{"id":"Europe/Berlin"},"locale":{"_content":"en_US"},"offset":0,"limit":100,"query":"in:\\"'+ address_book +'\\"","types":"contact","fetch":1}}}',
         function(data,status,xhr){ setContacts(data,status,xhr); popolateGroups(parent_element);},
          "json")
    //if data.size == limit >> getGroup altri 100
};
function getFolders(){
      var header='{"Header":{"context":{"_jsns":"urn:zimbra","authToken":"'+ authToken +'"}}';
      var body='"Body":{"GetFolderRequest":{"_jsns":"urn:zimbraMail","visible":"0"}}}';
      $.post(hostName + "/service/soap/GetFolderRequest", header + "," + body, 
                function(data,status,xhr){ setFolders(data,status,xhr)}, "json")
    //if data.size == limit >> getGroup altri 100
};


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
        //console.log($(this).data("dlist"));
        var emails=$(this).data("dlist").split(",");
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
    var group_div=$(".address_books_ul")
    group_div.empty();
    $.each(address_books,function(index, value){
        group_div.append(generateUlForAddressBook(value));
        //$('<li/>', {'id': 'address_book_li_' + value.id, 'class':'list-group-item address_book_li', 'text': value.name, 'data-id':value.id , 'data-targetid': 'address_book_ul_' + value.id , 'data-folderpath': value.absFolderPath}));
        //group_div.append($('<ul/>', {'class':'list-group list-group-collapse', 'id': 'address_book_ul_' + value.id}));

    })
    $('label.tree-toggler').click(function () {
        //$(this).parent().children('ul.tree').toggle(300);
      });

    $(".address_book_li").click(function(){
        getGroups($(this).data("folderpath").substring(1), $(this));
        $(this).children('ul.tree').toggle(300);
    });
    
}
function saveGroups(id,dlist){
    setGroups(id,dlist)
}


//////////////
function generateUlForAddressBook(address_book){

  var li=$('<li/>', 
        { 'id': 'address_book_li_' + address_book.id, 
          'class':' address_book_li',
          'data-id':address_book.id , 'data-targetid': 'address_book_ul_' + address_book.id , 
          'data-folderpath': address_book.absFolderPath
        }
        ).append($('<label/>', {'class':' tree-toggler nav-header',  'text': address_book.name})
        ).append($('<ul/>', {'class':'nav nav-list tree', 'id': 'address_book_ul_' + address_book.id}));
  return li;
}