/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

define(["N/search",'N/record', 'N/url','N/log'], function(search,record, url,log) {

    function checkInventory(itemId,location) {
        var availableQuantity = 0;
    
        // Create a search for inventory item balances
        var inventorySearch = search.create({
            type: search.Type.ITEM, 
            filters: [
                ['internalid', search.Operator.ANYOF, itemId], // Use 'internalid' for the item
                'AND', 
                ['inventorylocation', search.Operator.ANYOF, location] 
            ],
            columns: [
                search.createColumn({name: 'locationquantityavailable'})
                
            ]
        });
    
        
        inventorySearch.run().each(function(result) {
            
            availableQuantity = parseFloat(result.getValue({name: 'locationquantityavailable'}));
         
            return false;
        });
    
        return {
            availableQuantity: availableQuantity
        };
    }
    
    
    
    

    function createTransferOrder(items, fromLocation, toLocation,workOrderId,workOrderTranId) {
        var transferOrder = record.create({
            type: record.Type.TRANSFER_ORDER,
            isDynamic: true
        });
        transferOrder.setValue({ fieldId: 'customform', value: 197 });
        transferOrder.setValue({ fieldId: 'subsidiary', value: 3 });
        transferOrder.setValue({ fieldId: 'location', value: fromLocation });
        transferOrder.setValue({ fieldId: 'transferlocation', value:toLocation  });
    
        items.forEach(function(item, index) {
            // Logging to check for null or undefined items
            log.debug('Adding Item to Transfer Order', 'Item ID: ' + item.id + ' Quantity: ' + item.quantity);
            if (item.id == null || typeof item.id === 'undefined') {
                throw new Error('Item ID is null or undefined at index ' + index);
            }
            if (item.quantity == null || typeof item.quantity === 'undefined') {
                throw new Error('Item Quantity is null or undefined for Item ID ' + item.id);
            }
    
            transferOrder.selectNewLine({ sublistId: 'item' });
            transferOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.id });
            transferOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
            transferOrder.commitLine({ sublistId: 'item' });
        });
    
        var workOrderURL = url.resolveRecord({
            recordType: record.Type.WORK_ORDER,
            recordId: workOrderId
        });
        var linkURl  = '<a href="' + workOrderURL + '" target="_blank">#' + workOrderTranId + '</a>'
        log.debug("the Link" , linkURl)
        // Set the custom URL field with the link to the work order
        transferOrder.setValue({
            fieldId: 'custbody_work_order_id', // Replace with your actual custom URL field id
            value: linkURl
        });
        
        var transferOrderId = transferOrder.save({ ignoreMandatoryFields: true });
    
       
        var transferOrderTranId = search.lookupFields({
            type: record.Type.TRANSFER_ORDER,
            id: transferOrderId,
            columns: ['tranid']
        }).tranid;
    
        log.debug('Transfer Order Created', 'Transfer Order TranID: ' + transferOrderTranId);
    
        // Return the tranid instead of the internal ID
        return{
            transferOrderId:transferOrderId,
            transferOrderTranId:transferOrderTranId
        } 
    }
    




// Main logic to handle the transfer order creation
function createTransferOrders(workOrderId,workOrderTranId) {
    var workOrderItems = getWorkOrderItems(workOrderId);
    var itemsForLocationA = [];
    var itemsForLocationB = [];
    var locationA =50;
    var locationB =44;
    var destinationLocation = 55;

    // Check inventory for each item at both locations and decide where to create the transfer order from
    workOrderItems.forEach(function(item) {
        var availableAtLocationA = checkInventory(item.id, locationA).availableQuantity;
        var availableAtLocationB = checkInventory(item.id, locationB).availableQuantity;

        // If sufficient quantity is available at Location A, prepare to transfer from there
        if (availableAtLocationA >= item.quantity) {
            itemsForLocationA.push({
                id: item.id,
                quantity: item.quantity
            });
        } else if (availableAtLocationB >= item.quantity) { // If not at A, then check at Location B
            itemsForLocationB.push({
                id: item.id,
                quantity: item.quantity
            });
        }
        
        
    });

    // Create at most two transfer orders for the available items at each location
    var transferOrders = [];
    if (itemsForLocationA.length > 0) {
        transferOrders.push(createTransferOrder(itemsForLocationA, locationA, destinationLocation,workOrderId,workOrderTranId));
    }
    if (itemsForLocationB.length > 0) {
        transferOrders.push(createTransferOrder(itemsForLocationB, locationB, destinationLocation,workOrderId,workOrderTranId));
    }

    return transferOrders;
}





function getWorkOrderItems(workOrderId) {
    var workOrderItems = [];
    var workOrder = record.load({
        type: record.Type.WORK_ORDER,
        id: workOrderId
    });

    var itemCount = workOrder.getLineCount({ sublistId: 'item' });
    for (var i = 0; i < itemCount; i++) {
        workOrderItems.push({
            id: workOrder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }),
            quantity: workOrder.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })
        });
    }

    return workOrderItems;
}


return {
    createTransferOrders: createTransferOrders,
    checkInventory:checkInventory
};
});
