  chrome.storage.sync.get({
        server: "",
      }, function(items) {
        zimbraClient.hostName  = items.server;
        chrome.cookies.get({url: items.server, name:"ZM_AUTH_TOKEN"}, function(cookie){zimbraClient.authToken=cookie.value});
    
      });

$(document).ready(function() {


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
  
  //zimbraClient.getAuth()
  //    zimbraClient.getAddressBooks();
  //    popolateAddressBooks()

  $(".search_box").show();
  $(".panel-contact").hide();
  $(".panel-group").hide();
  
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
    $(".saveContact").click(function(){
        contact_id=$("#contactName").data("id");
        form_emails=$(".email.active").map(function(){return $(this).val()});
        zimbraClient.saveContact(contact_id,form_emails);
        alert("completed");
    }); 

    $(".cancelSave").click(function(){
      $(".panel-contact").hide();
      //TODO Clear Id 
      $(".panel-group").show();
    }); 
}); 
