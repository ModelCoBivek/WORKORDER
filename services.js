/**
 *  Service File
 * @NApiVersion 2.x
 */
define([
    'N/ui/message',
    "N/runtime"
],
    function (mess, runtime) {

        function setSessionStatus(type, title, message) {
            var sessionObj = runtime.getCurrentSession();
            sessionObj.set({
                name: "responseStatusType",
                value: type
            });
            sessionObj.set({
                name: "responseStatusTitle",
                value: title,
            });
            sessionObj.set({
                name: "responseStatusMessage",
                value: message
            });
        }
        function beforeLoadService(context) {
            if (context.type == "view") {
                var sessionObj = runtime.getCurrentSession();
                var messageData = sessionObj.get({ name: "responseStatusMessage" });
                var messageDataType = sessionObj.get({ name: "responseStatusType" });
                var messageDataTitle = sessionObj.get({ name: "responseStatusTitle" });
                if (messageData) {
                    var myMsg = mess.create({
                        title: messageDataTitle,
                        message: messageData,
                        type: messageDataType,
                        duration: 5000
                    });
                    context.form.addPageInitMessage({ message: myMsg });
                    setSessionStatus(null, null, null);
                }
            }
        }
        return {
            setSessionStatus: setSessionStatus,
            beforeLoadService: beforeLoadService
        };
    });