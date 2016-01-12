  chrome.storage.sync.get({
        server: "",
      }, function(items) {
        zimbraClient.hostName  = items.server;
        chrome.cookies.get({url: items.server, name:"ZM_AUTH_TOKEN"},
                             function(cookie){
                                zimbraClient.authToken=cookie.value;
                                zimbraClient.getAuth()
                                zimbraClient.getAddressBooks();
                                popolateAddressBooks();
                                });
                          });

$(document).ready(function() {
    $("#reload_groups").click(function(){
        zimbraClient.getAddressBooks();
        popolateAddressBooks();
      });
      
    $(".saveGroups").click(function(){
        var table=$('#contacts_table').DataTable();
        var new_dlist=$.map(table.data(),function(value){return value["contact"] + " <" + value["email"] + ">"});
        zimbraClient.saveGroups($("#label_group_name").data("id"),new_dlist);
        alert("completed");
    }); 


    $(".cancelSave").click(function(){
      $(".panel-contact").hide();
      //TODO Clear Id 
      $(".panel-group").show();
    });


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
            $(nTd).html("<span class='glyphicon glyphicon-trash deleteRow' aria-hidden='true'></span>");
           }}  
        ],
        buttons: ['excel',
                  'print',
                  { text: 'Add new',
                      action: function ( e, dt, node, config ) {
                          dt.row.add( {"DT_RowId":null, "contact_id" : "", "contact" : "--", "email" : "--", "original" : "", "link":"0" } ).draw( false );
                          //makeTableEditable();
                        }
                  }
         ],
        "createdRow": function( row, data, dataIndex ) {
         if ( data["contact_id"] == "" ) 
            { $(row).addClass( 'editable' ); }
          else
            { $(row).addClass( 'contact' );} 
        },
        "columnDefs":[
          {"targets":0, "searchable":false, "visible":false},
          {"targets":3, "searchable":false, "visible":false}
        ],
        "drawCallback": function( settings ) {
             makeTableEditable();
             $(".deleteRow").click(function(){deleteRow($(this))});
        } 

    });

    contacts_table.buttons().container().appendTo( $('.col-sm-6:eq(0)', contacts_table.table().container() ) );
    
    
    //   
    $(".contact_template").hide();
    $(".panel-contact").hide();
    $(".panel-group").hide();    
    $(".search_box").show();

        
   
}); 



function generateUlForAddressBook(address_book){
  var li=$('<li/>', 
        { 'id': 'address_book_li_' + address_book.id, 
          'class':' list-group-item ',
          'data-id':address_book.id , 'data-targetid': 'address_book_ul_' + address_book.id , 
          'data-folderpath': address_book.absFolderPath
        }
        ).append($('<label/>', {'class':' tree-toggler nav-header',  'text': 'Rubrica ' + address_book.name})
        ).append($('<ul/>', {'class':'nav nav-list tree', 'id': 'address_book_ul_' + address_book.id}));
        if (typeof address_book.owner == "string")
           {
            li.addClass("list-group-item-info");
            li.data("owner", address_book.owner );
           }
          else
           {li.addClass("list-group-item-success");}

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
        $(".panel-contact").hide();
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
  console.log(contact);
  $("#contactName").val(contact.fileAsStr);
  $("#contactName").data("id", id);
  $("#contactName").data("owner", contact.owner);
  email=contact._attrs.email;
  new_line=$(".contact_template").clone()
  new_line=new_line.removeClass("contact_template").addClass("new_email_line");
  new_line.find(".email").prop({ id: "email", name: "email"}).addClass("active").val(email);
  new_line.find(".saveContact").click(function(){saveContact(this)});

  $(".panel-contact.panel-primary").addClass("success");
  $(".panel-contact-body").append(new_line);


  var counter=2;
  while (email!=null)
    {
          email=null;
          if ('email'+counter in contact._attrs)
            {
              email=contact._attrs["email"+counter];
              new_line=$(".contact_template").clone()
              new_line=new_line.removeClass("contact_template").addClass("new_email_line");
              new_line.find(".email").prop({ id: "email"+counter, name: "email"+counter}).addClass("active").val(email);
              new_line.find(".saveContact").click(function(){saveContact(this)});
              

        $(".panel-contact-body").append(new_line);
              counter++
            }
    };
  
  $(".new_email_line").show();
}
function saveContact(btn){
        contact_id=$("#contactName").data("id");
        var emailField = $(btn).prev().prop("id");
        var emailValue = $(btn).prev().val();
        console.log(emailField);
        console.log(emailValue);
        form_emails=$(".email.active").map(function(){return $(this).val()});
        zimbraClient.saveContact(contact_id,emailField,emailValue);
        alert("completed");
    } 