/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof exquilla == 'undefined')
  var exquilla = {};
Components.utils.import("resource:///modules/mailServices.js");

exquilla.messengerComposeOverlay = (function ews_messengerComposeOverlay() {

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;
  if (typeof (exquilla.Utils) == "undefined")
    Cu.import("resource://exquilla/ewsUtils.jsm", exquilla);
  let log = exquilla.Utils.ewsLog;
  let re = exquilla.Utils.re;
  let safeGetInterface = exquilla.Utils.safeGetInterface;

  function dl(text) {
    dump(text + '\n');
  }

  function onLoad() {
    log.debug('messengerComposeOverlay.onLoad()');
    window.removeEventListener("load", exquilla.messengerComposeOverlay.onLoad, false);

    // Add the exQuilla autocomplete type
    let awText = document.getElementById("addressCol2#1");
    let autocompletesearch = awText.getAttribute("autocompletesearch");
    if (autocompletesearch.indexOf("exquilla-ab") == -1)
      awText.setAttribute("autocompletesearch", autocompletesearch + " exquilla-ab");

    // override FillIdentityList so that we can hide EWS identities when mail is disabled
    this.oldFillIdentityList = FillIdentityList;
    FillIdentityList = function ewsFillIdentityList(identityList)
    {
      let am = Cc["@mozilla.org/messenger/account-manager;1"]
                 .getService(Ci.nsIMsgAccountManager);
      //exquilla.Utils.ewsLog.debug('ewsFillIdentityList()');
      exquilla.messengerComposeOverlay.oldFillIdentityList(identityList);
      // remove any identities for !useMail servers
      let popup = identityList.menupopup;
      let children = popup.childNodes;
      for (let ip1 = children.length; ip1 > 0; ip1--)
      {
        try {
          let server = MailServices.accounts
                                   .getAccount(children[ip1 - 1].getAttribute("accountkey"))
                                   .incomingServer;
          let ewsServer = safeGetInterface(server, Ci.msqIEwsIncomingServer);
          if (ewsServer)
          {
            if (!ewsServer.useMail)
              popup.removeChild(children[ip1 - 1]);
          }
         } catch (e) {continue;}
      }
    }

    let identityList = document.getElementById("msgIdentity");
    if (identityList)
    {
      let popup = document.getElementById("msgIdentityPopup");
      if (popup) {
        while (popup.hasChildNodes())
          popup.lastChild.remove();
      }
      FillIdentityList(identityList);
    }
  }

  function onUnload() {
    window.removeEventListener("unload", exquilla.messengerComposeOverlay.onUnload, false);
    removeEventListener("compose-window-init", exquilla.messengerComposeOverlay.onInit, true);
  }

  function onInit(e)
  { try {
    log.debug("messengerComposeOverly.onInit gMsgCompose.type is " + gMsgCompose.type);
    let messenger = Cc["@mozilla.org/messenger;1"]
                      .createInstance(Ci.nsIMessenger);
    let hdr;
    try {
      // this fails for new message edits
      hdr = messenger.msgHdrFromURI(gMsgCompose.originalMsgURI);
    } catch (e) {}
    if (hdr && safeGetInterface(hdr.folder, Ci.msqIEwsMailFolder))
    {
      // We will setup a call to get all attachments with the ews server
      if (gMsgCompose.type == nsIMsgCompType.ForwardInline ||
          gMsgCompose.type == nsIMsgCompType.Draft ||
          gMsgCompose.type == nsIMsgCompType.Template // edit message as new
         )
      {
        let ewsServer = safeGetInterface(hdr.folder.server, Ci.msqIEwsIncomingServer);
        ewsServer.getAllAttachments(hdr, exquilla.messengerComposeOverlay.headerSink);
      }
    }
  } catch (e) {re(e);}}

  function handleAttachment(contentType, url, displayName, uri, aIsExternalAttachment)
  {
    log.debug("messengerComposeOverlay.handleAttachment " + displayName);
    UpdateAttachmentBucket(true);
    let attachment = Cc["@mozilla.org/messengercompose/attachment;1"]
                       .createInstance(Ci.nsIMsgAttachment);
    attachment.name = displayName;
    attachment.url = url;
    attachment.temporary = false;
    attachment.contentType = contentType;
    AddAttachments([attachment]);
  }

  function onEndAllAttachments()
  {}

  let pub = {};

  // public variables
  pub.onLoad = onLoad;
  pub.onUnload = onUnload;
  pub.onInit = onInit;

  pub.headerSink = {};
  pub.headerSink.handleAttachment = handleAttachment;
  pub.headerSink.onEndAllAttachments = onEndAllAttachments;
  return pub;

})();

window.addEventListener("load", function () {exquilla.messengerComposeOverlay.onLoad();}, false);
window.addEventListener("unload", function () {exquilla.messengerComposeOverlay.onUnload();}, false);
addEventListener("compose-window-init", function () {exquilla.messengerComposeOverlay.onInit();}, true);
