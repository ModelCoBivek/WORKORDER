/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(["N/search", "N/record", "N/query","./transferOrder"], function (
  search,
  record,
  query,
  order
) {
  /**
   * Function called upon sending a GET request to the RESTlet.
   *
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
   * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
   * @since
   */
  function doGet(requestParams) {
    try {
      var response;
      switch (requestParams.id) {
        case "hello":
          response = "hello world";
          break;
        default:
          break;
      }
      return response;
    } catch (err) {
      log.audit({
        title: "GET",
        details: JSON.stringify(err),
      });

      return err;
    }
  }
  /**
   * Function called upon sending a GET request to the RESTlet.
   *
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
   * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
   * @since
   */
  function doPost(requestBody) {
    try {
      var response;
      switch (requestBody.action) {
        case "createTransferOrders":
          response =order.createTransferOrders(requestBody.id)
          break;
          case "checkInventory":
          response =order.checkInventory(requestBody.id)
          break;

   
        default:
          break;
      }

      return response;
    } catch (error) {
      log.debug({
        title: "Error",
        details: JSON.stringify(error.message),
      });

      return error;
    }
  }

  return {
    get: doGet,
    post: doPost,
  };
});
