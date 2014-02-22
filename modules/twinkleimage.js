//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinkleimage.js: Image CSD module
 ****************************************
 * Mode of invocation:     Tab ("DI")
 * Active on:              File pages with a corresponding file which is local (not on Commons)
 * Config directives in:   TwinkleConfig
 */

Twinkle.image = function twinkleimage() {
	if (mw.config.get('wgNamespaceNumber') === 6 &&
			!document.getElementById("mw-sharedupload") &&
			document.getElementById("mw-imagepage-section-filehistory")) {

		Twinkle.addPortletLink(Twinkle.image.callback, "圖權", "tw-di", "提交文件快速刪除");
	}
};

Twinkle.image.callback = function twinkleimageCallback() {
	var Window = new Morebits.simpleWindow( 600, 330 );
	Window.setTitle( "文件快速刪除候選" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "快速刪除方針", "WP:CSD" );
	Window.addFooterLink( "Twinkle幫助", "WP:TW/DOC#image" );

	var form = new Morebits.quickForm( Twinkle.image.callback.evaluate );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '通知上傳者',
					value: 'notify',
					name: 'notify',
					tooltip: "如果您在標記同一用戶的很多文件，請取消此核取方塊以避免使用戶對話頁過載。",
					checked: Twinkle.getPref('notifyUserOnDeli')
				}
			]
		}
	);
	var field = form.append( {
			type: 'field',
			label: '需要的動作'
		} );
	field.append( {
			type: 'radio',
			name: 'type',
			list: [
				{
					label: '沒有來源（CSD F3）',
					value: 'no source',
					checked: true,
					tooltip: '本圖像並未註明原始出處，其聲稱的版權信息無法予以查證'
				},
				{
					label: '沒有版權（CSD F4）',
					value: 'no license',
					tooltip: '本檔案缺少版權信息'
				}
			]
		} );
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the parameters
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.type[0].dispatchEvent( evt );
};

Twinkle.image.callback.evaluate = function twinkleimageCallbackEvaluate(event) {
	var type;

	var notify = event.target.notify.checked;
	var types = event.target.type;
	for( var i = 0; i < types.length; ++i ) {
		if( types[i].checked ) {
			type = types[i].values;
			break;
		}
	}

	var csdcrit;
	switch( type ) {
		case 'no source':
			csdcrit = "f3";
			break;
		case 'no license':
			csdcrit = "f4";
			break;
		default:
			throw new Error( "Twinkle.image.callback.evaluate：未知條款" );
	}

	var lognomination = Twinkle.getPref('logSpeedyNominations') && Twinkle.getPref('noLogOnSpeedyNomination').indexOf(csdcrit.toLowerCase()) === -1;

	var params = {
		'type': type,
		'normalized': csdcrit,
		'lognomination': lognomination
	};
	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( event.target );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "標記完成";

	// Tagging image
	var wikipedia_page = new Morebits.wiki.page( mw.config.get('wgPageName'), '添加刪除標記' );
	wikipedia_page.setCallbackParameters( params );
	wikipedia_page.load( Twinkle.image.callbacks.taggingImage );

	// Notifying uploader
	if( notify ) {
		wikipedia_page.lookupCreator(Twinkle.image.callbacks.userNotification);
	} else {
		// add to CSD log if desired
		if (lognomination) {
			params.fromDI = true;
			Twinkle.speedy.callbacks.user.addToLog(params, null);
		}
		// No auto-notification, display what was going to be added.
		var noteData = document.createElement( 'pre' );
		noteData.appendChild( document.createTextNode( "{{subst:Uploadvionotice|" + Morebits.pageNameNorm + "}}--~~~~" ) );
		Morebits.status.info( '提示', [ '這些內容應貼進上傳者對話頁：', document.createElement( 'br' ),  noteData ] );
	}
};

Twinkle.image.callbacks = {
	taggingImage: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
		text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, "");
		// Adding discussion
		wikipedia_page = new Morebits.wiki.page("Wikipedia:檔案存廢討論/無版權訊息或檔案來源", "添加快速刪除記錄項");
		wikipedia_page.setFollowRedirect(true);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.image.callbacks.imageList);

		var tag = "{{subst:" + params.type + "/auto";
		tag += "}}\n";

		pageobj.setPageText(tag + text);
		pageobj.setEditSummary("請求快速刪除（[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]）：" + params.type + "。" + Twinkle.getPref('summaryAd'));
		switch (Twinkle.getPref('deliWatchPage')) {
			case 'yes':
				pageobj.setWatchlist(true);
				break;
			case 'no':
				pageobj.setWatchlistFromPreferences(false);
				break;
			default:
				pageobj.setWatchlistFromPreferences(true);
				break;
		}
		pageobj.setCreateOption('nocreate');
		pageobj.save();
	},
	userNotification: function(pageobj) {
		var params = pageobj.getCallbackParameters();
		var initialContrib = pageobj.getCreator();
		var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知上傳者(" + initialContrib + ")");
		var notifytext = "\n{{subst:Uploadvionotice|" + Morebits.pageNameNorm + "}}--~~~~";
		usertalkpage.setAppendText(notifytext);
		usertalkpage.setEditSummary("通知：文件[[" + Morebits.pageNameNorm + "]]快速刪除提名。" + Twinkle.getPref('summaryAd'));
		usertalkpage.setCreateOption('recreate');
		switch (Twinkle.getPref('deliWatchUser')) {
			case 'yes':
				usertalkpage.setWatchlist(true);
				break;
			case 'no':
				usertalkpage.setWatchlistFromPreferences(false);
				break;
			default:
				usertalkpage.setWatchlistFromPreferences(true);
				break;
		}
		usertalkpage.setFollowRedirect(true);
		usertalkpage.append();

		// add this nomination to the user's userspace log, if the user has enabled it
		if (params.lognomination) {
			params.fromDI = true;
			Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
		}
	},
	imageList: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		pageobj.setPageText(text + "\n* [[:" + Morebits.pageNameNorm + "]]--~~~~");
		pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}

};
})(jQuery);


//</nowiki>
