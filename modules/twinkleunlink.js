//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinkleunlink.js: Unlink module
 ****************************************
 * Mode of invocation:     Tab ("Unlink")
 * Active on:              Non-special pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.unlink = function twinkleunlink() {
	if( mw.config.get('wgNamespaceNumber') < 0 ) {
		return;
	}
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		Twinkle.addPortletLink( Twinkle.unlink.callback, "連入", "tw-unlink", "取消到本頁的連結" );
	}
};

Twinkle.unlink.getChecked2 = function twinkleunlinkGetChecked2( nodelist ) {
	if( !( nodelist instanceof NodeList ) && !( nodelist instanceof HTMLCollection ) ) {
		return nodelist.checked ? [ nodelist.values ] : [];
	}
	var result = [];
	for(var i  = 0; i < nodelist.length; ++i ) {
		if( nodelist[i].checked ) {
			result.push( nodelist[i].values );
		}
	}
	return result;
};

// the parameter is used when invoking unlink from admin speedy
Twinkle.unlink.callback = function(presetReason) {
	var Window = new Morebits.simpleWindow( 800, 400 );
	Window.setTitle( "取消連入" + (mw.config.get('wgNamespaceNumber') === 6 ? "和文件使用" : "") );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle幫助", "WP:TW/DOC#unlink" );

	var form = new Morebits.quickForm( Twinkle.unlink.callback.evaluate );
	form.append( {
		type: 'textarea',
		name: 'reason',
		label: '理由：',
		value: (presetReason ? presetReason : '')
	} );

	var query;
	if(mw.config.get('wgNamespaceNumber') === 6) {  // File:
		query = {
			'action': 'query',
			'list': [ 'backlinks', 'imageusage' ],
			'bltitle': Morebits.pageNameNorm,
			'iutitle': Morebits.pageNameNorm,
			'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'iulimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'blnamespace': Twinkle.getPref('unlinkNamespaces'),
			'iunamespace': Twinkle.getPref('unlinkNamespaces')
		};
	} else {
		query = {
			'action': 'query',
			'list': 'backlinks',
			'bltitle': Morebits.pageNameNorm,
			'blfilterredir': 'nonredirects',
			'bllimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500, // 500 is max for normal users, 5000 for bots and sysops
			'blnamespace': Twinkle.getPref('unlinkNamespaces')
		};
	}
	var wikipedia_api = new Morebits.wiki.api( '抓取連入', query, Twinkle.unlink.callbacks.display.backlinks );
	wikipedia_api.params = { form: form, Window: Window, image: mw.config.get('wgNamespaceNumber') === 6 };
	wikipedia_api.post();

	var root = document.createElement( 'div' );
	root.style.padding = '15px';  // just so it doesn't look broken
	Morebits.status.init( root );
	wikipedia_api.statelem.status( "載入中…" );
	Window.setContent( root );
	Window.display();
};

Twinkle.unlink.callback.evaluate = function twinkleunlinkCallbackEvaluate(event) {
	Twinkle.unlink.backlinksdone = 0;
	Twinkle.unlink.imageusagedone = 0;

	function processunlink(pages, imageusage) {
		var statusIndicator = new Morebits.status((imageusage ? '取消文件使用' : '取消連入'), '0%');
		var total = pages.length;  // removing doubling of this number - no apparent reason for it

		Morebits.wiki.addCheckpoint();

		if( !pages.length ) {
			statusIndicator.info( '100% （完成）' );
			Morebits.wiki.removeCheckpoint();
			return;
		}

		// get an edit token
		var params = { reason: reason, imageusage: imageusage, globalstatus: statusIndicator, current: 0, total: total };
		for (var i = 0; i < pages.length; ++i)
		{
			var myparams = $.extend({}, params);
			var articlepage = new Morebits.wiki.page(pages[i], '在條目：「' + pages[i] + '」中');
			articlepage.setCallbackParameters(myparams);
			articlepage.setBotEdit(true);  // unlink considered a floody operation
			articlepage.load(imageusage ? Twinkle.unlink.callbacks.unlinkImageInstances : Twinkle.unlink.callbacks.unlinkBacklinks);
		}
	}

	var reason = event.target.reason.value;
	if (!reason) {
		alert("您必須指定取消連入的理由。");
		return;
	}

	var backlinks, imageusage;
	if( event.target.backlinks ) {
		backlinks = Twinkle.unlink.getChecked2(event.target.backlinks);
	}
	if( event.target.imageusage ) {
		imageusage = Twinkle.unlink.getChecked2(event.target.imageusage);
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( event.target );
	Morebits.wiki.addCheckpoint();
	if (backlinks) {
		processunlink(backlinks, false);
	}
	if (imageusage) {
		processunlink(imageusage, true);
	}
	Morebits.wiki.removeCheckpoint();
};

Twinkle.unlink.backlinksdone = 0;
Twinkle.unlink.imageusagedone = 0;

Twinkle.unlink.callbacks = {
	display: {
		backlinks: function twinkleunlinkCallbackDisplayBacklinks(apiobj) {
			var xmlDoc = apiobj.responseXML;
			var havecontent = false;
			var list, namespaces, i;

			if( apiobj.params.image ) {
				var imageusage = $(xmlDoc).find('query imageusage iu');
				list = [];
				for ( i = 0; i < imageusage.length; ++i ) {
					var usagetitle = imageusage[i].getAttribute('title');
					list.push( { label: usagetitle, value: usagetitle, checked: true } );
				}
				if (!list.length)
				{
					apiobj.params.form.append( { type: 'div', label: '未找到文件使用。' } );
				}
				else
				{
					apiobj.params.form.append( { type:'header', label: '文件使用' } );
					namespaces = [];
					$.each(Twinkle.getPref('unlinkNamespaces'), function(k, v) {
						namespaces.push(Morebits.wikipedia.namespacesFriendly[v]);
					});
					apiobj.params.form.append( {
						type: 'div',
						label: "已選擇的名字空間：" + namespaces.join(', '),
						tooltip: "您可在Twinkle屬性中更改這個，請參見[[WP:TWPREFS]]"
					});
					if ($(xmlDoc).find('query-continue').length) {
						apiobj.params.form.append( {
							type: 'div',
							label: "顯示頭 " + list.length.toString() + " 個文件使用。"
						});
					}
					apiobj.params.form.append( {
						type: 'checkbox',
						name: 'imageusage',
						list: list
					} );
					havecontent = true;
				}
			}

			var backlinks = $(xmlDoc).find('query backlinks bl');
			if( backlinks.length > 0 ) {
				list = [];
				for ( i = 0; i < backlinks.length; ++i ) {
					var title = backlinks[i].getAttribute('title');
					list.push( { label: title, value: title, checked: true } );
				}
				apiobj.params.form.append( { type:'header', label: 'Backlinks' } );
				namespaces = [];
				$.each(Twinkle.getPref('unlinkNamespaces'), function(k, v) {
					namespaces.push(Morebits.wikipedia.namespacesFriendly[v]);
				});
				apiobj.params.form.append( {
					type: 'div',
					label: "已選擇的名字空間：" + namespaces.join(', '),
					tooltip: "您可在Twinkle屬性中更改這個，請參見[[WP:TWPREFS]]"
				});
				if ($(xmlDoc).find('query-continue').length) {
					apiobj.params.form.append( {
						type: 'div',
						label: "顯示頭 " + list.length.toString() + " 個連入。"
					});
				}
				apiobj.params.form.append( {
					type: 'checkbox',
					name: 'backlinks',
					list: list
				});
				havecontent = true;
			}
			else
			{
				apiobj.params.form.append( { type: 'div', label: '未找到連入。' } );
			}

			if (havecontent) {
				apiobj.params.form.append( { type:'submit' } );
			}

			var result = apiobj.params.form.render();
			apiobj.params.Window.setContent( result );
		}
	},
	unlinkBacklinks: function twinkleunlinkCallbackUnlinkBacklinks(pageobj) {
		var text, oldtext;
		text = oldtext = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var wikiPage = new Morebits.wikitext.page(text);
		wikiPage.removeLink(Morebits.pageNameNorm);
		text = wikiPage.getText();
		if (text === oldtext) {
			// Nothing to do, return
			Twinkle.unlink.callbacks.success(pageobj);
			Morebits.wiki.actionCompleted();
			return;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary("取消到頁面「" + Morebits.pageNameNorm + "」的連結：" + params.reason + "。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.unlink.callbacks.success);
	},
	unlinkImageInstances: function twinkleunlinkCallbackUnlinkImageInstances(pageobj) {
		var text, oldtext;
		text = oldtext = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		var wikiPage = new Morebits.wikitext.page(text);
		wikiPage.commentOutImage(mw.config.get('wgTitle'), '註釋出');
		text = wikiPage.getText();
		if (text === oldtext) {
			// Nothing to do, return
			Twinkle.unlink.callbacks.success(pageobj);
			Morebits.wiki.actionCompleted();
			return;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary("註釋出文件「" + Morebits.pageNameNorm + "：" + params.reason + "。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(Twinkle.unlink.callbacks.success);
	},
	success: function twinkleunlinkCallbackSuccess(pageobj) {
		var params = pageobj.getCallbackParameters();
		var total = params.total;
		var now = parseInt( 100 * (params.imageusage ? ++(Twinkle.unlink.imageusagedone) : ++(Twinkle.unlink.backlinksdone))/total, 10 ) + '%';
		params.globalstatus.update( now );
		if((params.imageusage ? Twinkle.unlink.imageusagedone : Twinkle.unlink.backlinksdone) >= total) {
			params.globalstatus.info( now + '（完成）' );
			Morebits.wiki.removeCheckpoint();
		}
	}
};
})(jQuery);


//</nowiki>
