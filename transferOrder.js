/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

define(["N/search", 'N/record', 'N/url', 'N/log'], function (search, record, url, log) {

    function checkInventory(items, location) {
        var inventorySearch = search.create({
            type: search.Type.ITEM,
            filters: [
                ['internalid', search.Operator.ANYOF, items],
                'AND',
                ['inventorylocation', search.Operator.ANYOF, location]
            ],
            columns: ['internalid', 'locationquantityavailable']
        });

        var itemQuantities = {};
        inventorySearch.run().each(function (result) {
            var quantity = parseFloat(result.getValue('locationquantityavailable'));
            // Only add to itemQuantities if quantity is a valid number and not NaN
            if (!isNaN(quantity)) {
                itemQuantities[result.getValue('internalid')] = quantity;
                log.debug('checkInventory', 'Item ID: ' + result.getValue('internalid') + ' has quantity: ' + quantity);
            } else {
                // Optionally log if a NaN value is encountered
                log.debug('checkInventory', 'Item ID: ' + result.getValue('internalid') + ' has an invalid quantity (NaN).');
            }
            return true;
        });
        log.debug('checkInventory', 'Completed checking inventory for items ');
        return itemQuantities;
    }




    function createTransferOrder(items, fromLocation, toLocation, workOrderId, workOrderTranId) {
        log.debug('createTransferOrder', 'Start creating transfer order from location: ' + fromLocation + ' to location: ' + toLocation);
        var transferOrder = record.create({
            type: record.Type.TRANSFER_ORDER,
            isDynamic: true
        });
        transferOrder.setValue({ fieldId: 'customform', value: 197 });
        transferOrder.setValue({ fieldId: 'subsidiary', value: 3 });
        transferOrder.setValue({ fieldId: 'location', value: fromLocation });
        transferOrder.setValue({ fieldId: 'transferlocation', value: toLocation });

        items.forEach(function (item, index) {
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
        var linkURl = '<a href="' + workOrderURL + '" target="_blank">#' + workOrderTranId + '</a>'
        log.debug("the Link", linkURl)
        // Set the custom URL field with the link to the work order
        transferOrder.setValue({
            fieldId: 'custbody_work_order_id', // Replace with your actual custom URL field id
            value: linkURl
        });

        var transferOrderId = transferOrder.save({ ignoreMandatoryFields: true });
        log.debug('createTransferOrder', 'Transfer Order saved with ID: ' + transferOrderId);

        var transferOrderTranId = search.lookupFields({
            type: record.Type.TRANSFER_ORDER,
            id: transferOrderId,
            columns: ['tranid']
        }).tranid;

        log.debug('Transfer Order Created', 'Transfer Order TranID: ' + transferOrderTranId);

        // Return the tranid instead of the internal ID
        return {
            transferOrderId: transferOrderId,
            transferOrderTranId: transferOrderTranId
        }
    }




    // Main logic to handle the transfer order creation
    function createTransferOrders(workOrderId, workOrderTranId) {
        log.debug('createTransferOrders', 'Start creating transfer orders for work order ID: ' + workOrderId);
        var workOrderItems = getWorkOrderItems(workOrderId);
        var itemsForLocationA = [];
        var itemsForLocationB = [];
        var itemsForBothLocations = [];
        var locationA = 50;
        var locationB = 44;
        var destinationLocation = 55;

        // Get a list of all item IDs for batch inventory check
        var itemIds = workOrderItems.map(function (item) {
            return item.id;
        });
        // Perform batch inventory checks
        var availableAtLocationA = checkInventory(itemIds, locationA);
        var availableAtLocationB = checkInventory(itemIds, locationB);

        workOrderItems.forEach(function (item) {
            var availableQuantityAtLocationA = availableAtLocationA[item.id] || 0; 
            var availableQuantityAtLocationB = availableAtLocationB[item.id] || 0; 

            if (availableQuantityAtLocationA >= item.quantity) {
                // If enough quantity is available at location A, push to itemsForLocationA
                itemsForLocationA.push({
                    id: item.id,
                    quantity: item.quantity
                });
            } else if (availableQuantityAtLocationB >= item.quantity) {
                // If enough quantity is available at location B, push to itemsForLocationB
                itemsForLocationB.push({
                    id: item.id,
                    quantity: item.quantity
                });

            } else {
                var totalAvailableQuantity = availableQuantityAtLocationA + availableQuantityAtLocationB;
                log.debug("the quantity","this is the total available quantity"+totalAvailableQuantity+"This is the item quantity is going to be deducted"+item.quantity);
                itemsForBothLocations.push({
                    id: item.id,
                    quantityFromA: availableQuantityAtLocationA,
                    quantityFromB: availableQuantityAtLocationB,
                    quantityNeeded: item.quantity
                });
            }
            log.debug('available Quantity', 'items of the quantity ' +
                'A - ' + JSON.stringify(availableQuantityAtLocationA) +
                ', B - ' + JSON.stringify(availableQuantityAtLocationB))

            log.debug('createTransferOrders', 'Determined items for transfer: ' +
                'A - ' + JSON.stringify(availableQuantityAtLocationA) +
                ', B - ' + JSON.stringify(availableQuantityAtLocationB) +
                ', Both - ' + JSON.stringify(itemsForBothLocations));

        });


        itemsForBothLocations.forEach(function (item) {
            var quantityFromA = availableAtLocationA[item.id] || 0;
            var quantityFromB = availableAtLocationB[item.id] || 0;
            var totalAvailableQuantity = quantityFromA + quantityFromB;
            var quantityNeeded = item.quantityNeeded; 

            var quantityToTakeFromA = Math.min(quantityNeeded, quantityFromA);
           
            var quantityToTakeFromB = quantityNeeded - quantityToTakeFromA;
        
            log.debug("inside the itemsforbothlocation", "Available at Location A: " + quantityFromA + ", Available at Location B: " + quantityFromB + ", Total quantity needed: " + quantityNeeded);
        
          
            if ( quantityNeeded > 0) {
               
                if (quantityToTakeFromA > 0) {
                    itemsForLocationA.push({
                        id: item.id,
                        quantity: quantityToTakeFromA
                    });
                }
        
                // Add the calculated quantity to take from B to the itemsForLocationB array
                if (quantityToTakeFromB > 0) {
                    itemsForLocationB.push({
                        id: item.id,
                        quantity: quantityToTakeFromB
                    });
                }
            }
        });
        


        log.debug('createTransferOrders', 'Split items from both locations: A' + JSON.stringify(itemsForLocationA) + 'locations:B' + JSON.stringify(itemsForLocationB));



        // Create at most two transfer orders for the available items at each location
        var transferOrders = [];
        if (itemsForLocationA.length > 0) {
            transferOrders.push(createTransferOrder(itemsForLocationA, locationA, destinationLocation, workOrderId, workOrderTranId));
            log.debug('createTransferOrders', 'Transfer order created for items from location A');
        }


        if (itemsForLocationB.length > 0) {
            transferOrders.push(createTransferOrder(itemsForLocationB, locationB, destinationLocation, workOrderId, workOrderTranId));
            log.debug('createTransferOrders', 'Transfer order created for items from location B');
        }


        log.debug('createTransferOrders', 'Completed creating transfer orders with results: ' + JSON.stringify(transferOrders));
        return transferOrders;
    }

    // 






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
        checkInventory: checkInventory
    };
});
