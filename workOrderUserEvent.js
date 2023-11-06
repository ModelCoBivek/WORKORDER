/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * 
 */
define(['N/record', 'N/runtime', 'N/log','N/url', './transferOrder', './services','N/ui/message'],
function (record, runtime, log,url, order, service,mess) {
    function afterSubmit(context) {
        try {
            log.debug('beforeSubmit', 'Starting beforeSubmit function');

        
            if (context.type === context.UserEventType.EDIT) {
                var newRecord = context.newRecord;
                var oldRecord = context.oldRecord;

                log.debug('Record Info', {
                    newStatus: newRecord.getValue({fieldId: 'orderstatus'}),
                    oldStatus: oldRecord.getValue({fieldId: 'orderstatus'}),
                    subsidiary: newRecord.getValue({fieldId: 'subsidiary'}),
                    workOrderId: newRecord.id
                });

                // Check if the status changed from A to B and subsidiary is 3
                var oldStatus = oldRecord.getValue({fieldId: 'orderstatus'});
                var newStatus = newRecord.getValue({fieldId: 'orderstatus'});
                var subsidiary = newRecord.getValue({fieldId: 'subsidiary'});
                var workOrderTranId = newRecord.getValue({fieldId : 'tranid'});

                if (oldStatus === 'A' && newStatus === 'B' && subsidiary === '3') { 
                    var workOrderId = newRecord.id;
                    
                  
                    var transferOrderResults = order.createTransferOrders(workOrderId,workOrderTranId);

                    log.debug('Transfer Order IDs', transferOrderResults);

                 
            

                    if (transferOrderResults && transferOrderResults.length > 0) {
                        var transferOrderLinks = transferOrderResults.map(function(result) {
                            var linkURL = url.resolveRecord({
                                recordType: record.Type.TRANSFER_ORDER,
                                recordId: result.transferOrderId
                            });
                            return '<a href="' + linkURL + '" target="_blank">#' + result.transferOrderTranId + '</a>';
                        }).join(', ');
                        log.debug('Transfer Order Links', transferOrderLinks);

                       
                        var workOrderRecord = record.load({
                            type: record.Type.WORK_ORDER,
                            id: workOrderId
                        });

               
                        workOrderRecord.setValue({
                            fieldId: 'custbody_transfer_order_record',
                            value: transferOrderLinks
                        });

                        // Saving the changes to the work order
                        workOrderRecord.save({ignoreMandatoryFields: true});

                        service.setSessionStatus(mess.Type.CONFIRMATION, "Transfer Order", "Created successfully: " + transferOrderLinks);
                    } else {
                        service.setSessionStatus(mess.Type.ERROR, "Transfer Order", "Creation unsuccessful - No Transfer Orders were created");
                    }
                } else {
                    log.debug('Status Change or Subsidiary Check', 'Either status did not change from A to B or subsidiary is not 3');
                }
            } else {
                log.debug('Event Type', 'The script did not run because the event type was not EDIT');
            }
        } catch (e) {
            service.setSessionStatus(mess.Type.ERROR, "Transfer Order", "Creation unsuccessful - " + e.message);
            log.error({
                title: 'Error in beforeSubmit function',
                details: e.message
            });
            throw e; // Re-throw the error if  the script to halt on failure
        }
    }

    function beforeLoad(context) {

        service.beforeLoadService(context);
    }


    return {
        beforeLoad:beforeLoad,
        afterSubmit: afterSubmit
    };
});
