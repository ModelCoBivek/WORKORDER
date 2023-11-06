/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/log', 'N/url', './transferOrder', './services', 'N/ui/message'],
    function (record, runtime, log, url, order, service, message) {
        function afterSubmit(context) {
            try {
                if (context.type === context.UserEventType.EDIT) {
                    var newRecord = context.newRecord;
                    var oldRecord = context.oldRecord;

                    // Check if the status changed from A to B and subsidiary is 3
                    var oldStatus = oldRecord.getValue({ fieldId: 'orderstatus' });
                    var newStatus = newRecord.getValue({ fieldId: 'orderstatus' });
                    var subsidiary = newRecord.getValue({ fieldId: 'subsidiary' });
                    var workOrderTranId = newRecord.getValue({ fieldId: 'tranid' });

                    if (oldStatus === 'A' && newStatus === 'B' && subsidiary === '3') {
                        var workOrderId = newRecord.id;


                        var transferOrderResults = order.createTransferOrders(workOrderId, workOrderTranId);

                        if (transferOrderResults && transferOrderResults.length > 0) {
                            var transferOrderLinks = transferOrderResults.map(function (result) {
                                return '<a href="' + url.resolveRecord({
                                    recordType: record.Type.TRANSFER_ORDER,
                                    recordId: result.transferOrderId
                                }) + '" target="_blank">#' + result.transferOrderTranId + '</a>';
                            }).join(', ');


                            newRecord.setValue({
                                fieldId: 'custbody_transfer_order_record',
                                value: transferOrderLinks
                            });


                            record.submitFields({
                                type: newRecord.type,
                                id: newRecord.id,
                                values: {
                                    custbody_transfer_order_record: transferOrderLinks
                                },
                                options: {
                                    ignoreMandatoryFields: true
                                }
                            });


                            service.setSessionStatus(message.Type.CONFIRMATION, "Transfer Order", "Created successfully: " + transferOrderLinks);
                        } else {
                            service.setSessionStatus(message.Type.ERROR, "Transfer Order", "Creation unsuccessful - No Transfer Orders were created");
                        }
                    }
                }
            } catch (e) {
                service.setSessionStatus(message.Type.ERROR, "Transfer Order", "Creation unsuccessful - " + e.message);
                log.error({
                    title: 'Error in afterSubmit function',
                    details: e.message
                });
                throw e; // Re-throw the error to halt script execution
            }
        }



        function beforeLoad(context) {

            service.beforeLoadService(context);
        }


        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });
