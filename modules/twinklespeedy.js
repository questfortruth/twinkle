//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 * Config directives in:   TwinkleConfig
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, add it to the appropriate places at the top of
 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
 *   in twinkle.js, and add your new criterion to those if you think it would be
 *   good.
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink( Twinkle.speedy.callback, "速刪", "tw-csd", Morebits.userIsInGroup('sysop') ? "快速刪除" : "請求快速刪除" );
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(Morebits.userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

// Used by unlink feature
Twinkle.speedy.dialog = null;

// The speedy criteria list can be in one of several modes
Twinkle.speedy.mode = {
	sysopSubmit: 1,  // radio buttons, no subgroups, submit when "Submit" button is clicked
	sysopRadioClick: 2,  // radio buttons, no subgroups, submit when a radio button is clicked
	userMultipleSubmit: 3,  // check boxes, subgroups, "Submit" button already pressent
	userMultipleRadioClick: 4,  // check boxes, subgroups, need to add a "Submit" button
	userSingleSubmit: 5,  // radio buttons, subgroups, submit when "Submit" button is clicked
	userSingleRadioClick: 6,  // radio buttons, subgroups, submit when a radio button is clicked

	// are we in "delete page" mode?
	// (sysops can access both "delete page" [sysop] and "tag page only" [user] modes)
	isSysop: function twinklespeedyModeIsSysop(mode) {
		return mode === Twinkle.speedy.mode.sysopSubmit ||
			mode === Twinkle.speedy.mode.sysopRadioClick;
	},
	// do we have a "Submit" button once the form is created?
	hasSubmitButton: function twinklespeedyModeHasSubmitButton(mode) {
		return mode === Twinkle.speedy.mode.sysopSubmit ||
			mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userSingleSubmit;
	},
	// is db-multiple the outcome here?
	isMultiple: function twinklespeedyModeIsMultiple(mode) {
		return mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick;
	},
	// do we want subgroups? (if not we have to use prompt())
	wantSubgroups: function twinklespeedyModeWantSubgroups(mode) {
		return !Twinkle.speedy.mode.isSysop(mode);
	}
};

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	var dialog;
	Twinkle.speedy.dialog = new Morebits.simpleWindow( Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight') );
	dialog = Twinkle.speedy.dialog;
	dialog.setTitle( "選擇快速刪除理由" );
	dialog.setScriptName( "Twinkle" );
	dialog.addFooterLink( "快速刪除方針", "WP:CSD" );
	dialog.addFooterLink( "Twinkle幫助", "WP:TW/DOC#speedy" );

	var form = new Morebits.quickForm( callbackfunc, (Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null) );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '只標記，不刪除',
						value: 'tag_only',
						name: 'tag_only',
						tooltip: '如果您只想標記此頁面而不是刪除它',
						checked : Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							var cForm = event.target.form;
							var cChecked = event.target.checked;
							// enable/disable talk page checkbox
							if (cForm.talkpage) {
								cForm.talkpage.disabled = cChecked;
								cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable/disable redirects checkbox
							cForm.redirects.disabled = cChecked;
							cForm.redirects.checked = !cChecked;

							// enable/disable notify checkbox
							cForm.notify.disabled = !cChecked;
							cForm.notify.checked = cChecked;
							// enable/disable multiple
							cForm.multiple.disabled = !cChecked;
							cForm.multiple.checked = false;

							Twinkle.speedy.callback.modeChanged(cForm);

							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '刪除相關選項' } );
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) {  // hide option for user pages, to avoid accidentally deleting user talk page
			form.append( {
				type: 'checkbox',
				list: [
					{
						label: '刪除討論頁',
						value: 'talkpage',
						name: 'talkpage',
						tooltip: "刪除時附帶刪除此頁面的討論頁。",
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		}
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '刪除重定向',
						value: 'redirects',
						name: 'redirects',
						tooltip: "刪除到此頁的重定向。",
						checked: Twinkle.getPref('deleteRedirectsOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '標記相關選項' } );
	}

	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '如可能，通知創建者',
					value: 'notify',
					name: 'notify',
					tooltip: "一個通知模板將會被加入創建者的對話頁，如果您啟用了該理據的通知。",
					checked: !Morebits.userIsInGroup( 'sysop' ) || Twinkle.getPref('deleteSysopDefaultToTag'),
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						event.stopPropagation();
					}
				}
			]
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '應用多個理由',
					value: 'multiple',
					name: 'multiple',
					tooltip: "您可選擇應用於該頁的多個理由。",
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						Twinkle.speedy.callback.modeChanged( event.target.form );
						event.stopPropagation();
					}
				}
			]
		} );

	form.append( {
			type: 'div',
			name: 'work_area',
			label: '初始化CSD模塊失敗，請重試，或將這報告給Twinkle開發者。'
		} );

	if( Twinkle.getPref( 'speedySelectionStyle' ) !== 'radioClick' ) {
		form.append( { type: 'submit' } );
	}

	var result = form.render();
	dialog.setContent( result );
	dialog.display();

	Twinkle.speedy.callback.modeChanged( result );
};

Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
	var namespace = mw.config.get('wgNamespaceNumber');
	var form = form;

	// first figure out what mode we're in
	var mode = Twinkle.speedy.mode.userSingleSubmit;
	if (form.tag_only && !form.tag_only.checked) {
		mode = Twinkle.speedy.mode.sysopSubmit;
	} else {
		if (form.multiple.checked) {
			mode = Twinkle.speedy.mode.userMultipleSubmit;
		} else {
			mode = Twinkle.speedy.mode.userSingleSubmit;
		}
	}
	if (Twinkle.getPref('speedySelectionStyle') === 'radioClick') {
		mode++;
	}

	var work_area = new Morebits.quickForm.element( {
			type: 'div',
			name: 'work_area'
		} );

	if (mode === Twinkle.speedy.mode.userMultipleRadioClick) {
		work_area.append( {
				type: 'div',
				label: '當選擇完成後，點擊：'
			} );
		work_area.append( {
				type: 'button',
				name: 'submit-multiple',
				label: '提交',
				event: function( event ) {
					Twinkle.speedy.callback.evaluateUser( event );
					event.stopPropagation();
				}
			} );
	}

	var radioOrCheckbox = (Twinkle.speedy.mode.isMultiple(mode) ? 'checkbox' : 'radio');

	switch (namespace) {
		case 0:  // article
			work_area.append( { type: 'header', label: '條目' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.articleList, mode) } );
			break;

		case 2:  // user
		case 3:  // user talk
			work_area.append( { type: 'header', label: '用戶頁' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.userList, mode) } );
			break;

		case 6:  // file
			work_area.append( { type: 'header', label: '文件' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.fileList, mode) } );
			if (!Twinkle.speedy.mode.isSysop(mode)) {
				work_area.append( { type: 'div', label: '標記CSD F3、F4，請使用Twinkle的「圖權」功能。' } );
			}
			break;

		case 14:  // category
			work_area.append( { type: 'header', label: '分類' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.categoryList, mode) } );
			break;

		default:
			break;
	}

	work_area.append( { type: 'header', label: '常規' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.generalList, mode) });
	if (!Twinkle.speedy.mode.isSysop(mode)) {
		work_area.append( { type: 'div', label: '標記CSD G16，請使用Twinkle的「侵權」功能。' } );
	}

	if (Morebits.wiki.isPageRedirect() || Morebits.userIsInGroup('sysop')) {
		work_area.append( { type: 'header', label: '重定向' } );
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.redirectList, mode) } );
	}

	var old_area = Morebits.quickForm.getElements(form, "work_area")[0];
	form.replaceChild(work_area.render(), old_area);
};

Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {
	// mode switches
	var isSysop = Twinkle.speedy.mode.isSysop(mode);
	var multiple = Twinkle.speedy.mode.isMultiple(mode);
	var wantSubgroups = Twinkle.speedy.mode.wantSubgroups(mode);
	var hasSubmitButton = Twinkle.speedy.mode.hasSubmitButton(mode);

	var openSubgroupHandler = function(e) { 
		$(e.target.form).find('input').attr('disabled', 'disabled');
		$(e.target.form).children().css('color', 'gray');
		$(e.target).parent().css('color', 'black').find('input').attr('disabled', false);
		$(e.target).parent().find('input:text')[0].focus();
		e.stopPropagation();
	};
	var submitSubgroupHandler = function(e) {
		Twinkle.speedy.callback.evaluateUser(e);
		e.stopPropagation();
	}

	return $.map(list, function(critElement) {
		var criterion = $.extend({}, critElement);

		// hack to get the g11 radio / checkbox right
		if (criterion.value === 'g11') {
			criterion.style = Twinkle.getPref('enlargeG11Input') ? 'height: 2em; width: 2em; height: -moz-initial; width: -moz-initial; -moz-transform: scale(2); -o-transform: scale(2);' : '';
		}

		if (!wantSubgroups) {
			criterion.subgroup = null;
		}

		if (multiple) {
			if (criterion.hideWhenMultiple) {
				return null;
			}
			if (criterion.hideSubgroupWhenMultiple) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenSingle) {
				return null;
			}
			if (criterion.hideSubgroupWhenSingle) {
				criterion.subgroup = null;
			}
		}

		if (isSysop) {
			if (criterion.hideWhenSysop) {
				return null;
			}
			if (criterion.hideSubgroupWhenSysop) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenUser) {
				return null;
			}
			if (criterion.hideSubgroupWhenUser) {
				criterion.subgroup = null;
			}
		}

		if (criterion.subgroup && !hasSubmitButton) {
			if ($.isArray(criterion.subgroup)) {
				criterion.subgroup.push({ 
					type: 'button',
					name: 'submit',
					label: '提交',
					event: submitSubgroupHandler
				});
			} else {
				criterion.subgroup = [
					criterion.subgroup,
					{
						type: 'button',
						name: 'submit',  // ends up being called "csd.submit" so this is OK
						label: '提交',
						event: submitSubgroupHandler
					}
				];
			}
			criterion.event = openSubgroupHandler;
		}

		return criterion;
	});
}

Twinkle.speedy.fileList = [
	{
		label: 'F1: 重複的檔案（完全相同或縮小），而且不再被條目使用',
		value: 'f1',
		subgroup: {
			name: 'f1_filename',
			type: 'input',
			label: '與此文件相同的文件名：',
			tooltip: '可不含「File:」前綴。'
		}
	},
	{
		label: 'F3: 所有未知版權的檔案和來源不明檔案',
		value: 'f3',
		hideWhenUser: true
	},
	{
		label: 'F4: 沒有提供版權狀況、來源等資訊的檔案',
		value: 'f4',
		hideWhenUser: true
	},
	{
		label: 'F5: 被高分辨率或SVG檔案取代的圖片',
		value: 'f5',
		subgroup: {
			name: 'f5_filename',
			type: 'input',
			label: '新文件名：',
			tooltip: '可不含「File:」前綴。'
		}
	},
	{
		label: 'F6: 沒有被條目使用的非自由版權檔案',
		value: 'f6',
	},
	{
		label: 'F7: 與維基共享資源檔案重複的檔案',
		value: 'f7',
		subgroup: {
			name: 'f7_filename',
			type: 'input',
			label: '維基共享資源上的文件名：',
			value: Morebits.pageNameNorm,
			tooltip: '如與本文件名相同則可留空，可不含「File:」前綴。'
		},
		hideWhenMultiple: true
	}
];

Twinkle.speedy.articleList = [
	{
		label: 'A1: 非常短，而且沒有定義或內容。',
		value: 'a1',
		tooltip: '例如：「他是一個很有趣的人，他創建了工廠和莊園。並且，順便提一下，他的妻子也很好。」如果能夠發現任何相關的內容，可以將這個頁面重定向到相關的條目上。'
	},
	{
		label: 'A2: 內容只包括外部連接、參見、圖書參考、類別標籤、模板標籤、跨語言連接的條目。',
		value: 'a2',
		tooltip: '請注意：有些維基人創建條目時會分開多次保存，請避免刪除有人正在工作的頁面。帶有{{inuse}}的不適用。'
	},
	{
		label: 'A3: 複製自其他中文維基計劃，或是與其他中文維基計劃內容相同的文章。或者是透過Transwiki系統移動的文章。',
		value: 'a3'
	},
	{
		label: 'A5: 條目建立時之內容即與其他現有條目內容完全相同，且名稱不適合做為其他條目之重定向。',
		value: 'a5',
		tooltip: '條目被建立時，第一個版本的內容與當時其他現存條目完全相同，且這個條目的名稱不適合改為重定向，就可以提送快速刪除。如果名稱可以作為重定向，就應直接改重定向，不要提送快速刪除。如果是多個條目合併產生的新條目，不適用。如果是從主條目拆分產生的條目，不適用；如有疑慮，應提送存廢討論處理。',
		subgroup: {
			name: 'a5_pagename',
			type: 'input',
			label: '現有條目名：',
			size: 60
		}
	}
];

Twinkle.speedy.categoryList = [
	{
		label: 'O4: 空的類別（沒有條目也沒有子類別）。',
		value: 'o4',
		tooltip: '不適用於Category:不要刪除的分類中的空分類。'
	}
];

Twinkle.speedy.userList = [
	{
		label: 'O1: 用戶請求刪除自己的用戶頁或其子頁面。',
		value: 'o1',
		tooltip: '如果是從其他名字空間移動來的，須附有合理原因。'
	},
	{
		label: 'O3: 匿名用戶的用戶討論頁，其中的內容不再有用。',
		value: 'o3',
		tooltip: '避免給使用同一IP地址的用戶帶來混淆。不適用於用戶討論頁的存盤頁面。'
	}
];

Twinkle.speedy.generalList = [
	{
		label: '自定義理由' + (Morebits.userIsInGroup('sysop') ? '（自定義刪除理由）' : ''),
		value: 'reason',
		tooltip: '該頁至少應該符合一條快速刪除的標準，並且您必須在理由中提到。這不是萬能的刪除理由。',
		subgroup: {
			name: 'reason_1',
			type: 'input',
			label: '理由：',
			size: 60
		},
		hideWhenMultiple: true,
		hideSubgroupWhenSysop: true
	},
	{
		label: 'G1: 沒有實際內容的頁面',
		value: 'g1',
		tooltip: '如「adfasddd」。參見Wikipedia:胡言亂語。但注意：圖片也算是內容。'
	},
	{
		label: 'G2: 測試頁面',
		value: 'g2',
		tooltip: '例如：「這是一個測試。」'
	},
	{
		label: 'G3: 純粹破壞，包括但不限於明顯的惡作劇、錯誤信息、人身攻擊等',
		value: 'g3',
		tooltip: '包括明顯的錯誤信息、明顯的惡作劇、信息明顯錯誤的圖片，以及清理移動破壞時留下的重定向。'
	},
	{
		label: 'G5: 曾經根據頁面存廢討論、侵權審核或文件存廢討論結果刪除後又重新創建的內容，而有關內容與已刪除版本相同或非常相似，無論標題是否相同',
		value: 'g5',
		tooltip: '該內容之前必須是經存廢討論刪除，如之前屬於快速刪除，請以相同理由重新提送快速刪除。該內容如與被刪除的版本明顯不同，而提刪者認為需要刪除，請交到存廢討論，如果提刪者對此不肯定，請先聯絡上次執行刪除的管理人員。不適用於根據存廢覆核結果被恢復的內容。在某些情況下，重新創建的條目有機會發展。那麼不應提交快速刪除，而應該提交存廢覆核或存廢討論重新評核。',
		subgroup: {
			name: 'g5_1',
			type: 'input',
			label: '刪除討論位置：',
			tooltip: '必須以「Wikipedia:」開頭',
			size: 60
		}
	},
	{
		label: 'G8: 管理員因技術原因刪除頁面',
		value: 'g8',
		tooltip: '包括解封用戶後刪除用戶頁、因用戶奪取而刪除、刪除MediaWiki頁面、因移動請求而刪除頁面。',
		hideWhenUser: true
	},
	{
		label: 'G10: 原作者清空頁面或提出刪除，且貢獻者只有一人',
		value: 'g10',
		tooltip: '對條目內容無實際修改的除外；提請須出於善意，及附有合理原因。',
		subgroup: {
			name: 'g10_rationale',
			type: 'input',
			label: '可選的解釋：',
			tooltip: '比如作者在哪裡請求了刪除。',
			size: 60
		}
	},
	{
		label: 'G11: 明顯的廣告宣傳頁面，或只有相關人物或團體的聯繫方法的頁面',
		value: 'g11',
		tooltip: '頁面只收宣傳之用，並須完全重寫才能貼合百科全書要求。須注意，僅僅以某公司或產品為主題的條目，並不直接導致其自然滿足此速刪標準。'
	},
	{
		label: 'G12: 未列明來源且語調負面的生者傳記',
		value: 'g12',
		tooltip: '注意是未列明來源且語調負面，必須2項均符合。'
	},
	{
		label: 'G13: 明顯、拙劣的機器翻譯',
		value: 'g13'
	},
	{
		label: 'G14: 超過兩週沒有進行任何翻譯的非現代標準漢語頁面',
		value: 'g14',
		tooltip: '包括所有未翻譯的外語、漢語方言以及文言文。',
		hideWhenUser: true
	},
	{
		label: 'G15: 孤立頁面，比如沒有主頁面的討論頁、指向空頁面的重定向等',
		value: 'g15',
		tooltip: '包括以下幾種類型：1. 沒有對應文件的文件頁面；2. 沒有對應母頁面的子頁面，用戶頁子頁面除外；3. 指向不存在頁面的重定向；4. 沒有對應內容頁面的討論頁，討論頁存檔和用戶討論頁除外；5. 不存在註冊用戶的用戶頁及用戶頁子頁面，隨用戶更名產生的用戶頁重定向除外。請在刪除時注意有無將內容移至他處的必要。不包括在主頁面掛有{{CSD Placeholder}}模板的討論頁。'
	},
	{
		label: 'G16: 因為主頁面侵權而創建的臨時頁面仍然侵權',
		value: 'g16',
		hideWhenUser: true
	}
];

Twinkle.speedy.redirectList = [
	{
		label: 'R2: 跨名字空間重定向。',
		value: 'r2',
		tooltip: '由條目的名字空間重定向至非條目名字空間，或將用戶頁移出條目名字空間時遺留的重定向。'
	},
	{
		label: 'R3: 格式錯誤，或明顯筆誤的重定向。',
		value: 'r3',
		tooltip: '非一眼能看出的拼寫錯誤和翻譯或標題用字的爭議應交由存廢討論處理。',
		subgroup: {
			name: 'r3_type',
			type: 'select',
			label: '適用類別：',
			list: [
				{ label: '請選擇', value: '' },
				{ label: '標題繁簡混用', value: '標題繁簡混用。' },
				{ label: '消歧義使用的括號或空格錯誤', value: '消歧義使用的括號或空格錯誤。' },
				{ label: '間隔號使用錯誤', value: '間隔號使用錯誤。' },
				{ label: '標題中使用非常見的錯別字', value: '標題中使用非常見的錯別字。' },
				{ label: '移動侵權頁面的臨時頁後所產生的重定向', value: '移動侵權頁面的臨時頁後所產生的重定向。' }
			]
		},
		hideSubgroupWhenSysop: true
	},
	{
		label: 'R5: 指向本身的重定向或循環的重定向。',
		value: 'r5',
		tooltip: '如A→B→C→……→A。'
	}
];

Twinkle.speedy.normalizeHash = {
	'reason': 'db',
	'multiple': 'multiple',
	'multiple-finish': 'multiple-finish',
	'g1': 'g1',
	'g2': 'g2',
	'g3': 'g3',
	'g5': 'g5',
	'g8': 'g8',
	'g10': 'g10',
	'g11': 'g11',
	'g12': 'g12',
	'g13': 'g13',
	'g14': 'g14',
	'g15': 'g15',
	'g16': 'g16',
	'a1': 'a1',
	'a2': 'a2',
	'a3': 'a3',
	'a5': 'a5',
	'r2': 'r2',
	'r3': 'r3',
	'r5': 'r5',
	'f1': 'f1',
	'f3': 'f3',
	'f4': 'f4',
	'f5': 'f5',
	'f6': 'f6',
	'f7': 'f7',
	'o1': 'o1',
	'o3': 'o3',
	'o4': 'o4'
};

// keep this synched with [[MediaWiki:Deletereason-dropdown]]
Twinkle.speedy.reasonHash = {
	'reason': '',
// General
	'g1': '無實際內容',
	'g2': '測試頁',
	'g3': '破壞',
	'g5': '曾經依存廢討論被刪除的重建內容',
	'g8': '技術原因',
	'g10': '作者請求',
	'g11': '廣告或宣傳',
	'g12': '未列明來源或違反生者傳記的負面內容',
	'g13': '明顯且拙劣的機器翻譯',
	'g14': '超過兩週沒有翻譯的非現代標準漢語頁面',
	'g15': '孤立頁面',
	'g16': '臨時頁面依然侵權',
// Articles
	'a1': '非常短而無定義或內容',
	'a2': '內容只包含參考、連結、模板或/及分類',
	'a3': '與其他中文維基計劃內容相同的文章',
	'a5': '條目建立時之內容即與其他現有條目內容相同',
// Redirects
	'r2': '跨名字空間重定向',
	'r3': '標題錯誤的重定向',
	'r5': '指向本身的重定向或循環的重定向',
// Images and media
	'f1': '重複的圖片',
	'f3': '[[:Category:未知版權的檔案]]',
	'f4': '[[:Category:來源不明檔案]]',
	'f5': '已有高分辨率的圖片取代',
	'f6': '孤立而沒有被條目使用的非自由版權圖片',
	'f7': '[[:Category:與維基共享資源重複的檔案]]',
// User pages
	'o1': '用戶請求刪除自己的用戶頁或其子頁面',
	'o3': '匿名用戶的討論頁',
// Categories
	'o4': '空的類別'
// Templates
// Portals
};

Twinkle.speedy.callbacks = {
	sysop: {
		main: function( params ) {
			var thispage;

			Morebits.wiki.addCheckpoint();  // prevent actionCompleted from kicking in until user interaction is done

			// look up initial contributor. If prompting user for deletion reason, just display a link.
			// Otherwise open the talk page directly
			if( params.openusertalk ) {
				thispage = new Morebits.wiki.page( mw.config.get('wgPageName') );  // a necessary evil, in order to clear incorrect status text
				thispage.setCallbackParameters( params );
				thispage.lookupCreator( Twinkle.speedy.callbacks.sysop.openUserTalkPage );
			}

			// delete page
			var reason;
			thispage = new Morebits.wiki.page( mw.config.get('wgPageName'), "刪除頁面" );
			if (params.normalized === 'db') {
				reason = prompt("輸入刪除理由：", "");
			} else {
				var presetReason = "[[WP:CSD#" + params.normalized.toUpperCase() + "|" + params.normalized.toUpperCase() + "]]: " + params.reason;
				if (Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
					reason = prompt("輸入刪除理由，或點擊確定以接受自動生成的：", presetReason);
				} else {
					reason = presetReason;
				}
			}
			if (reason === null) {
				Morebits.status.error("詢問理由", "用戶取消操作。");
				Morebits.wiki.removeCheckpoint();
				return;
			} else if (!reason || !reason.replace(/^\s*/, "").replace(/\s*$/, "")) {
				Morebits.status.error("詢問理由", "你不給我理由…我就…不管了…");
				Morebits.wiki.removeCheckpoint();
				return;
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );
			thispage.deletePage(function() {
				thispage.getStatusElement().info("完成");
				Twinkle.speedy.callbacks.sysop.deleteTalk( params );
			});
			Morebits.wiki.removeCheckpoint();
		},
		deleteTalk: function( params ) {
			// delete talk page
			if (params.deleteTalkPage &&
					params.normalized !== 'f7' &&
					params.normalized !== 'o1' &&
					document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Morebits.wiki.page( Morebits.wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "刪除討論頁" );
				talkpage.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立頁面: 已刪除頁面「' + Morebits.pageNameNorm + "」的討論頁" + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
				// this is ugly, but because of the architecture of wiki.api, it is needed
				// (otherwise success/failure messages for the previous action would be suppressed)
				window.setTimeout(function() { Twinkle.speedy.callbacks.sysop.deleteRedirects( params ); }, 1800);
			} else {
				Twinkle.speedy.callbacks.sysop.deleteRedirects( params );
			}
		},
		deleteRedirects: function( params ) {
			// delete redirects
			if (params.deleteRedirects) {
				var query = {
					'action': 'query',
					'list': 'backlinks',
					'blfilterredir': 'redirects',
					'bltitle': mw.config.get('wgPageName'),
					'bllimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				var wikipedia_api = new Morebits.wiki.api( '取得重定向列表…', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.status( '刪除重定向' ) );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}

			// prompt for protect on G11
			var $link, $bigtext;
			if (params.normalized === 'g11') {
				$link = $('<a/>', {
					'href': '#',
					'text': '點擊這裡施行保護',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						mw.config.set('wgArticleId', 0);
						Twinkle.protect.callback();
					}
				});
				$bigtext = $('<span/>', {
					'text': '白紙保護該頁',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}

			// promote Unlink tool
			var $link, $bigtext;
			if( mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f7' ) {
				$link = $('<a/>', {
					'href': '#',
					'text': '點擊這裡前往反連工具',
					'css': { 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消對已刪除文件 " + Morebits.pageNameNorm + " 的使用");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消對已刪除文件的使用',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f7') {
				$link = $('<a/>', {
					'href': '#',
					'text': '點擊這裡前往反連工具',
					'css': { 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消對已刪除頁面 " + Morebits.pageNameNorm + " 的連結");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消對已刪除頁面的連結',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var params = pageobj.getCallbackParameters();

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': Morebits.pageNameNorm
			};

			if (params.normalized === 'db' || Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
				// provide a link to the user talk page
				var $link, $bigtext;
				$link = $('<a/>', {
					'href': mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
					'text': '點此打開User talk:' + user,
					'target': '_blank',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				$bigtext = $('<span/>', {
					'text': '通知頁面創建者',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else {
				// open the initial contributor's talk page
				var statusIndicator = new Morebits.status('打開用戶' + user + '對話頁編輯表單', '打開中…');

				switch( Twinkle.getPref('userTalkPageMode') ) {
				case 'tab':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank' );
					break;
				case 'blank':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				case 'window':
					/* falls through */
				default:
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
						( window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow' ),
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				}

				statusIndicator.info( '完成' );
			}
		},
		deleteRedirectsMain: function( apiobj ) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('backlinks bl');
			var total = $snapshot.length;
			var statusIndicator = apiobj.statelem;

			if( !total ) {
				statusIndicator.status("未發現重定向");
				return;
			}

			statusIndicator.status("0%");

			var current = 0;
			var onsuccess = function( apiobjInner ) {
				var now = parseInt( 100 * (++current)/total, 10 ) + '%';
				statusIndicator.update( now );
				apiobjInner.statelem.unlink();
				if( current >= total ) {
					statusIndicator.info( now + '（完成）' );
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.page(title, '刪除重定向 "' + title + '"');
				page.setEditSummary('[[WP:CSD#G15|CSD G15]]: 孤立頁面: 重定向到已刪除頁面「' + Morebits.pageNameNorm + "」" + Twinkle.getPref('deletionSummaryAd'));
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			var statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error( "頁面不存在，可能已被刪除" );
				return;
			}

			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			statelem.status( '檢查頁面已有標記…' );

			// check for existing deletion tags
			var tag = /(?:\{\{\s*(db|d|delete|db-.*?)(?:\s*\||\s*\}\}))/i.exec( text );
			if( tag ) {
				statelem.error( [ Morebits.htmlNode( 'strong', tag[1] ) , " 已被置於頁面中。" ] );
				return;
			}

			var xfd = /(?:\{\{([rsaiftcm]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec( text );
			if( xfd && !confirm( "刪除相關模板{{" + xfd[1] + "}}已被置於頁面中，您是否仍想添加一個快速刪除模板？" ) ) {
				return;
			}

			var code, parameters, i;
			if (params.normalizeds.length > 1) {
				code = "{{delete";
				$.each(params.normalizeds, function(index, norm) {
					code += "|" + norm.toUpperCase();
					parameters = params.templateParams[index] || [];
					for (var i in parameters) {
						if (typeof parameters[i] === 'string') {
							code += "|" + parameters[i];
						}
					}
				});
				code += "}}";
				params.utparams = [];
			} else {
				parameters = params.templateParams[0] || [];
				code = "{{delete";
				if (params.values[0] !== 'reason') {
					code += '|' + params.values[0];
				}
				for (i in parameters) {
					if (typeof parameters[i] === 'string') {
						code += "|" + parameters[i];
					}
				}
				code += "}}";
				params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);
			}

			var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if( Twinkle.getPref('markSpeedyPagesAsPatrolled') ) {
				thispage.patrol();
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = "<noinclude>" + code + "</noinclude>";
			}

			// Remove tags that become superfluous with this action
			text = text.replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");
			if (mw.config.get('wgNamespaceNumber') === 6) {
				// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
				text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, "");
			}

			// Generate edit summary for edit
			var editsummary;
			if (params.normalizeds.length > 1) {
				editsummary = '請求快速刪除（';
				$.each(params.normalizeds, function(index, norm) {
					editsummary += '[[WP:CSD#' + norm.toUpperCase() + '|CSD ' + norm.toUpperCase() + ']]、';
				});
				editsummary = editsummary.substr(0, editsummary.length - 1); // remove trailing comma
				editsummary += '）。';
			} else if (params.normalizeds[0] === "db") {
				editsummary = '請求[[WP:CSD|快速刪除]]：' + parameters["1"];
			/*} else if (params.values[0] === "histmerge") {
				editsummary = "Requesting history merge with [[" + parameters["1"] + "]] ([[WP:CSD#G6|CSD G6]]).";*/
			} else {
				editsummary = "請求快速刪除（[[WP:CSD#" + params.normalizeds[0].toUpperCase() + "|CSD " + params.normalizeds[0].toUpperCase() + "]]）。";
			}

			pageobj.setPageText(code + "\n" + text);
			pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
			pageobj.setWatchlist(params.watch);
			pageobj.setCreateOption('nocreate');
			pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
		},

		tagComplete: function(pageobj) {
			var params = pageobj.getCallbackParameters();

			// Notification to first contributor
			if (params.usertalk) {
				var callback = function(pageobj) {
					var initialContrib = pageobj.getCreator();

					// don't notify users when their user talk page is nominated
					if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.status.warn("通知頁面創建者：用戶創建了自己的對話頁");
						return;
					}

					var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知頁面創建者（" + initialContrib + "）"),
					    notifytext, i;

					notifytext = "\n{{subst:db-notice|target=" + Morebits.pageNameNorm;
					notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}}--~~~~";

					var editsummary = "通知：";
					if (params.normalizeds.indexOf("g12") === -1) {  // no article name in summary for G10 deletions
						editsummary += "頁面[[" + Morebits.pageNameNorm + "]]";
					} else {
						editsummary += "一攻擊性頁面";
					}
					editsummary += "快速刪除提名";

					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
					usertalkpage.setCreateOption('recreate');
					usertalkpage.setFollowRedirect(true);
					usertalkpage.append();

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.page(Morebits.pageNameNorm);
				thispage.lookupCreator(callback);
			}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for CSD: params.values, params.normalizeds  (note: normalizeds is an array)
		//   for DI: params.fromDI = true, params.type, params.normalized  (note: normalized is a string)
		addToLog: function(params, initialContrib) {
			var wikipedia_page = new Morebits.wiki.page("User:" + mw.config.get('wgUserName') + "/" + Twinkle.getPref('speedyLogPageName'), "添加項目到用戶日誌");
			params.logInitialContrib = initialContrib;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.speedy.callbacks.user.saveLog);
		},

		saveLog: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			var appendText = "";

			// add blurb if log page doesn't exist
			if (!pageobj.exists()) {
				appendText +=
					"這是該用戶使用[[WP:TW|Twinkle]]的速刪模塊做出的[[WP:CSD|快速刪除]]提名列表。\n\n" +
					"如果您不再想保留此日誌，請在[[Wikipedia:Twinkle/參數設置|參數設置]]中關掉，並" +
					"使用[[WP:CSD#O1|CSD O1]]提交快速刪除。\n";
				if (Morebits.userIsInGroup("sysop")) {
					appendText += "\n此日誌並不記錄用Twinkle直接執行的刪除。\n";
				}
			}

			// create monthly header
			var date = new Date();
			var headerRe = new RegExp("^==+\\s*" + date.getUTCFullYear() + "\\s*年\\s*" + (date.getUTCMonth() + 1) + "\\s*月\\s*==+", "m");
			if (!headerRe.exec(text)) {
				appendText += "\n\n=== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 ===";
			}

			appendText += "\n# [[:" + Morebits.pageNameNorm + "]]: ";
			if (params.fromDI) {
				appendText += "圖版[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]（" + params.type + "）";
			} else {
				if (params.normalizeds.length > 1) {
					appendText += "多個理由（";
					$.each(params.normalizeds, function(index, norm) {
						appendText += "[[WP:CSD#" + norm.toUpperCase() + "|" + norm.toUpperCase() + ']]、';
					});
					appendText = appendText.substr(0, appendText.length - 1);  // remove trailing comma
					appendText += '）';
				} else if (params.normalizeds[0] === "db") {
					appendText += "自定義理由";
				} else {
					appendText += "[[WP:CSD#" + params.normalizeds[0].toUpperCase() + "|CSD " + params.normalizeds[0].toUpperCase() + "]]";
				}
			}

			if (params.logInitialContrib) {
				appendText += "；通知{{user|" + params.logInitialContrib + "}}";
			}
			appendText += " ~~~~~\n";

			pageobj.setAppendText(appendText);
			pageobj.setEditSummary("記錄對[[" + Morebits.pageNameNorm + "]]的快速刪除提名。" + Twinkle.getPref('summaryAd'));
			pageobj.setCreateOption("recreate");
			pageobj.append();
		}
	}
};

// validate subgroups in the form passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
	var parameters = [];

	$.each(values, function(index, value) {
		var currentParams = [];
		switch (value) {
			case 'reason':
				if (form["csd.reason_1"]) {
					var dbrationale = form["csd.reason_1"].value;
					if (!dbrationale || !dbrationale.trim()) {
						alert( '自定義理由：請指定理由。' );
						parameters = null;
						return false;
					}
					currentParams["1"] = dbrationale;
				}
				break;

			case 'a5':
				if (form["csd.a5_pagename"]) {
					var otherpage = form["csd.a5_pagename"].value;
					if (!otherpage || !otherpage.trim()) {
						alert( 'CSD A5：請提供現有條目的名稱。' );
						parameters = null;
						return false;
					}
					currentParams.pagename = otherpage;
				}
				break;

			case 'g5':
				if (form["csd.g5_1"]) {
					var deldisc = form["csd.g5_1"].value;
					if (deldisc) {
						if (deldisc.substring(0, 9) !== "Wikipedia" &&
							deldisc.substring(0, 3) !== "WP:" &&
							deldisc.substring(0, 5) !== "維基百科:" &&
							deldisc.substring(0, 5) !== "維基百科:") {
							alert( 'CSD G5：您提供的討論頁名必須以「Wikipedia:」開頭。' );
							parameters = null;
							return false;
						}
						currentParams["1"] = deldisc;
					}
				}
				break;

			case 'g10':
				if (form["csd.g10_rationale"] && form["csd.g10_rationale"].value) {
					currentParams.rationale = form["csd.g10_rationale"].value;
				}
				break;

			case 'f1':
				if (form["csd.f1_filename"]) {
					var redimage = form["csd.f1_filename"].value;
					if (!redimage || !redimage.trim()) {
						alert( 'CSD F1：請提供另一文件的名稱。' );
						parameters = null;
						return false;
					}
					currentParams.filename = redimage.replace(/^\s*(Image|File|文件|檔案):/i, "");
				}
				break;

			case 'f5':
				if (form["csd.f5_filename"]) {
					var redimage = form["csd.f5_filename"].value;
					if (!redimage || !redimage.trim()) {
						alert( 'CSD F5：請提供另一文件的名稱。' );
						parameters = null;
						return false;
					}
					currentParams.filename = redimage.replace(/^\s*(Image|File|文件|檔案):/i, "");
				}
				break;

			case 'f7':
				if (form["csd.f7_filename"]) {
					var filename = form["csd.f7_filename"].value;
					if (filename && filename !== Morebits.pageNameNorm) {
						if (filename.indexOf("Image:") === 0 || filename.indexOf("File:") === 0 ||
							filename.indexOf("文件:") === 0 || filename.indexOf("檔案:") === 0) {
							currentParams["1"] = filename;
						} else {
							currentParams["1"] = "File:" + filename;
						}
					}
				}
				break;

			case 'r3':
				if (form["csd.r3_type"]) {
					var redirtype = form["csd.r3_type"].value;
					if (!redirtype) {
						alert( 'CSD R3：請選擇適用類別。' );
						parameters = null;
						return false;
					}
					currentParams["1"] = redirtype;
				}
				break;

			default:
				break;
		}
		parameters.push(currentParams);
	});
	return parameters;
};

// function for processing talk page notification template parameters
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) {
	var utparams = [];
	switch (normalized) {
		default:
			break;
	}
	return utparams;
};


Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
	var values = (e.target.form ? e.target.form : e.target).getChecked('csd');
	if (values.length === 0) {
		alert( "請選擇一個理據！" );
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
	var form = (e.target.form ? e.target.form : e.target);

	var tag_only = form.tag_only;
	if( tag_only && tag_only.checked ) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var value = Twinkle.speedy.resolveCsdValues(e)[0];
	if (!value) {
		return;
	}
	var normalized = Twinkle.speedy.normalizeHash[ value ];

	var params = {
		value: value,
		normalized: normalized,
		watch: Twinkle.getPref('watchSpeedyPages').indexOf( normalized ) !== -1,
		reason: Twinkle.speedy.reasonHash[ value ],
		openusertalk: Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf( normalized ) !== -1,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Twinkle.speedy.callbacks.sysop.main( params );
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox" || e.target.type === "text" || 
			e.target.type === "select") {
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	//var multiple = form.multiple.checked;
	var normalizeds = [];
	$.each(values, function(index, value) {
		var norm = Twinkle.speedy.normalizeHash[ value ];

		// for sysops only
		if (['f3', 'f4'].indexOf(norm) !== -1) {
			alert("您不能使用此工具標記CSD F3、F4，請使用「圖版」工具，或取消勾選「僅標記」。");
			return;
		}

		normalizeds.push(norm);
	});

	// analyse each criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	$.each(normalizeds, function(index, norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = true;
			return false;  // break
		}
	});

	var notifyuser = false;
	if (form.notify.checked) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(norm) !== -1) {
				notifyuser = true;
				return false;  // break
			}
		});
	}

	var welcomeuser = false;
	if (notifyuser) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(norm) !== -1) {
				welcomeuser = true;
				return false;  // break
			}
		});
	}

	var csdlog = false;
	if (Twinkle.getPref('logSpeedyNominations')) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('noLogOnSpeedyNomination').indexOf(norm) === -1) {
				csdlog = true;
				return false;  // break
			}
		});
	}

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog,
		templateParams: Twinkle.speedy.getParameters( form, values )
	};
	if (!params.templateParams) {
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "標記完成";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "標記頁面");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};
})(jQuery);


//</nowiki>
