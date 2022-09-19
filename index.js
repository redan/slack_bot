const {App} = require('@slack/bolt');
const currencyService = require('./currency-service');
const Modal = require('./modal');
const store = require('./store');
const Today = require('./today');
const { GoogleSpreadsheet } =  require('google-spreadsheet');
const creds = require('./true-shoreline-273721-0d04a40bdc87.json');
const doc = new GoogleSpreadsheet('15FsEhA7Y9hEb32Jrwzf_H2Evtd-R1ttCX7XRsvH6-AQ');

const modal = new Modal();


const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    // appToken: process.env.SLACK_APP_TOKEN,
    //socketMode: true,
});


app.view('currency_callback', async ({ack, body, view, client}) => {
    try {
        const amount = view.state.values.amount.valute.value;
        const source = view.state.values.source.valute.selected_option.value;
        const target = view.state.values.target.valute.selected_option.value;
        const user = body.user.id;

        const err = modal.validate(amount, source, target);
        if (err) {
            await ack({
                response_action: 'errors',
                errors: err
            });
        } else {
            await ack();
            const result = currencyService.calculate(amount, source, target);
            const txt = `${amount} ${source} = ${result} ${target}`;

            await client.chat.postMessage({
                channel: user,
                text: txt
            });
        }
    } catch (e) {
        console.error(e);
    }
});

app.command('/currency', async ({command, ack, client}) => {
    await ack();

    try {
        await client.views.open({
            trigger_id: command.trigger_id,
            view:
                {
                    "callback_id": "currency_callback",
                    "type": "modal",
                    "title": {
                        "type": "plain_text",
                        "text": "Валютный калькулятор"
                    },
                    "submit": {
                        "type": "plain_text",
                        "text": "Расчет"
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Отмена"
                    },
                    "blocks": [
                        {
                            "block_id": "amount",
                            "type": "input",
                            "element": {
                                "type": "plain_text_input",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Количество в исходной валюте"
                                },
                                "action_id": "valute"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Исходное количество"
                            }
                        },
                        {
                            "block_id": "source",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Выберите валюту"
                                },
                                "options": modal.getValuteList(),
                                "action_id": "valute"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Исходная валюта"
                            }
                        },
                        {
                            "block_id": "target",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Выберите валюту"
                                },
                                "options": modal.getValuteList(),
                                "action_id": "valute"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Целевая валюта"
                            }
                        }
                    ]
                }

        });
    } catch (e) {
        console.error(e);
    }
});

app.command('/info', async ({ack, say}) => {
    await ack();
    try{
        await  say("*Привет я офисный бот.*  \n Я могу выполнять конвертацию валюты по сегодняшнему курсу. Принимать запросы на редактирование кнопки и ливборда. \n\n" +
            "Чтобы вызвать конвертер валют введи команду */currency* \nЧтобы исправить кнопку введи команду /knopka \nЧтобы исправиь ливбордк команду /correct_lb");
    } catch (e) {
        console.error(e);
    }
});

app.view('knopka_callback', async ({ack, body, view, client}) => {;
    try {
        const date = view.state.values.date.datepicker.selected_date;
        const time = view.state.values.time.timepicker.selected_time;
        const target = view.state.values.target.static_select.selected_option.value;
        const info = view.state.values.info.plain_text.value;
        const user = body.user.name;
        const officeManager = "UPC4TGS2H"; // Кому приходит сообщение

        await ack();

        const txt = `Пользователь: ${user} \nДата: ${date} \nВремя: ${time} \nДействие:  ${target} \nКоментарий: ${info}`;
        const textForUser = "Ваш запрос получен, кнопку поправят в течении дня";

        await client.chat.postMessage({
            channel: officeManager,
            text: txt
        });

        await client.chat.postMessage({
            channel: body.user.id,
            text: textForUser
        });

        // Add row to googleSheet
        await doc.loadInfo()
        const sheet = doc.sheetsByIndex[0]
        await sheet.addRow({
            User: user,
            Date: date,
            Time: time,
            Action: target,
            Comment: info
        });

    } catch (e) {
        console.error(e);
    }
});

app.command('/knopka', async ({command, ack, client}) => {
    await ack();

    const now = new Today();

    try {
        await client.views.open({
            trigger_id: command.trigger_id,
            view:
                {
                    "callback_id": "knopka_callback",
                    "type": "modal",
                    "title": {
                        "type": "plain_text",
                        "text": "Изменение кнопки",
                    },
                    "submit": {
                        "type": "plain_text",
                        "text": "Отправить"
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Отмена"
                    },
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Заполните форму для измениения кнопки"
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "block_id": "date",
                            "type": "input",
                            "element": {
                                "type": "datepicker",
                                "initial_date": now.getDay(),
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select a date",
                                    "emoji": true
                                },
                                "action_id": "datepicker"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Дата",
                                "emoji": true
                            }
                        },
                        {
                            "block_id": "time",
                            "type": "input",
                            "element": {
                                "type": "timepicker",
                                "initial_time": now.getTime(),
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select time",
                                    "emoji": true
                                },
                                "action_id": "timepicker"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Время",
                                "emoji": true
                            }
                        },
                        {
                            "block_id": "target",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select an item",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Приход",
                                            "emoji": true
                                        },
                                        "value": "Приход"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Уход",
                                            "emoji": true
                                        },
                                        "value": "Уход"
                                    }
                                ],
                                "action_id": "static_select"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Выберите",
                            }
                        },
                        {
                            "block_id": "info",
                            "type": "input",
                            "optional": true,
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "plain_text"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Комментарий",
                            }
                        }
                    ]
                }
        });
    } catch (e) {
        console.error(e);
    }
});

app.view('leavebord_callback', async ({ack, body, view, client}) => {
    try {
        const date = view.state.values.date.datepicker.selected_date;
        const target = view.state.values.target.static_select.selected_option.value;
        const info = view.state.values.info.plain_text.value;
        const user = body.user.name;
        const officeManager = "UPC4TGS2H"; // Кому приходит сообщение

        await ack();
        const txt = `Пользователь: ${user} \nДата: ${date} \nДействие:  ${target} \nКоментарий: ${info}`;
        const textForUser = "Ваш запрос получен, ливборд поправят в течении дня";

        await client.chat.postMessage({
            channel: officeManager,
            text: txt
        });

        await client.chat.postMessage({
            channel: body.user.id,
            text: textForUser
        });

        // Add row to googleSheet
        await doc.loadInfo()
        const sheet = doc.sheetsByIndex[1]
        await sheet.addRow({
            User: user,
            Date: date,
            Action: target,
            Comment: info
        });

    } catch (e) {
        console.error(e);
    }
});

app.command('/correct_lb', async ({command, ack, client}) => {
    await ack();

    const now = new Today();


    try {
        await client.views.open({
            trigger_id: command.trigger_id,
            view:
                {
                    "callback_id": "leavebord_callback",
                    "type": "modal",
                    "title": {
                        "type": "plain_text",
                        "text": "Изменение ливборда"
                    },
                    "submit": {
                        "type": "plain_text",
                        "text": "Отправить"
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Отмена"
                    },
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Заполните форму для внесения измениений ливборд"
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "block_id": "date",
                            "type": "input",
                            "element": {
                                "type": "datepicker",
                                "initial_date": now.getDay(),
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select a date",
                                    "emoji": true
                                },
                                "action_id": "datepicker"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Дата",
                                "emoji": true
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "mrkdwn",
                                    "text": "Если нужно задать несколько дней укажите это в комментарии"
                                }
                            ]
                        },
                        {
                            "block_id": "target",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select an item",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Unpaid leave",
                                            "emoji": true
                                        },
                                        "value": "Unpaid leave"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Medical leave",
                                            "emoji": true
                                        },
                                        "value": "Medical leave"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Vocation",
                                            "emoji": true
                                        },
                                        "value": "Vocation"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Business trip",
                                            "emoji": true
                                        },
                                        "value": "Business trip"
                                    }
                                ],
                                "action_id": "static_select"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Выберите",
                                "emoji": true
                            }
                        },
                        {
                            "block_id": "info",
                            "type": "input",
                            "optional": true,
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "plain_text"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Комментарий",
                                "emoji": true
                            }
                        }
                    ]
                }

        });
    } catch (e) {
        console.error(e);
    }
});

app.event('app_home_opened', async ({ event, say }) => {
    let user = store.getUser(event.user);

    if (!user) {
        user = {
            user: event.user,
            channel: event.channel
        };
        store.addUser(user);

        await say({
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Привет "+`<@${event.user}>`+"!",
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "\n\nЯ могу принимать запросы на редактирование кнопки и ливборда и выполнять конвертацию валюты по сегодняшнему курсу.\n\nДля более подробной информации введи команду */info*"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "action_id": "knopka",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "КНОПКА"
                            },
                            "style": "primary",
                            "value": "click_me_123"
                        },
                        {
                            "type": "button",
                            "action_id": "leaveBoard",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "LeaveBoard"
                            },
                            "style": "primary",
                            "value": "click_me_123"
                        },
                        {
                            "type": "button",
                            "action_id": "currency",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Конвертация валют"
                            },
                            "style": "primary",
                            "value": "click_me_123"
                        },
                        {
                            "type": "button",
                            "action_id": "currency_curse",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Курс валют"
                            },
                            "style": "primary",
                            "value": "click_me_1234"
                        }
                    ]
                }
            ]
        });
    } else {
        return null;
    }
});

app.action('leaveBoard', async ({ ack, client, body }) => {
    // Acknowledge action request
    await ack();

    const now = new Today();

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view:
                {
                    "callback_id": "leavebord_callback",
                    "type": "modal",
                    "title": {
                        "type": "plain_text",
                        "text": "Изменение ливборда"
                    },
                    "submit": {
                        "type": "plain_text",
                        "text": "Отправить"
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Отмена"
                    },
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Заполните форму для внесения измениений ливборд"
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "block_id": "date",
                            "type": "input",
                            "element": {
                                "type": "datepicker",
                                "initial_date": now.getDay(),
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select a date",
                                    "emoji": true
                                },
                                "action_id": "datepicker"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Дата",
                                "emoji": true
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    "type": "mrkdwn",
                                    "text": "Если нужно задать несколько дней укажите это в комментарии"
                                }
                            ]
                        },
                        {
                            "block_id": "target",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select an item",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Unpaid leave",
                                            "emoji": true
                                        },
                                        "value": "Unpaid leave"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Medical leave",
                                            "emoji": true
                                        },
                                        "value": "Medical leave"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Vocation",
                                            "emoji": true
                                        },
                                        "value": "Vocation"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Business trip",
                                            "emoji": true
                                        },
                                        "value": "Business trip"
                                    }
                                ],
                                "action_id": "static_select"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Выберите"
                            }
                        },
                        {
                            "type": "input",
                            "element": {
                                "type": "multi_users_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select users",
                                    "emoji": true
                                },
                                "action_id": "multi_users_select-action"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Выберите вашего руководителя",
                            }
                        },
                        {
                            "block_id": "info",
                            "type": "input",
                            "optional": true,
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "plain_text"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Комментарий",
                                "emoji": true
                            }
                        }
                    ]
                }

        });
    } catch (e) {
        console.error(e);
    }
});

app.action('currency', async ({ ack, client, body }) => {
    // Acknowledge action request
    await ack();

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view:
                {
                    "callback_id": "currency_callback",
                    "type": "modal",
                    "title": {
                        "type": "plain_text",
                        "text": "Валютный калькулятор"
                    },
                    "submit": {
                        "type": "plain_text",
                        "text": "Расчет"
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Отмена"
                    },
                    "blocks": [
                        {
                            "block_id": "amount",
                            "type": "input",
                            "element": {
                                "type": "plain_text_input",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Количество в исходной валюте"
                                },
                                "action_id": "valute"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Исходное количество"
                            }
                        },
                        {
                            "block_id": "source",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Выберите валюту"
                                },
                                "options": modal.getValuteList(),
                                "action_id": "valute"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Исходная валюта"
                            }
                        },
                        {
                            "block_id": "target",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Выберите валюту"
                                },
                                "options": modal.getValuteList(),
                                "action_id": "valute"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Целевая валюта"
                            }
                        }
                    ]
                }

        });
    } catch (e) {
        console.error(e);
    }
});

app.action('knopka', async ({ ack, client, body }) => {
    // Acknowledge action request
    await ack();

    const now = new Today();

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view:
                {
                    "callback_id": "knopka_callback",
                    "type": "modal",
                    "title": {
                        "type": "plain_text",
                        "text": "Изменение кнопки",
                    },
                    "submit": {
                        "type": "plain_text",
                        "text": "Отправить"
                    },
                    "close": {
                        "type": "plain_text",
                        "text": "Отмена"
                    },
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Заполните форму для измениения кнопки"
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "block_id": "date",
                            "type": "input",
                            "element": {
                                "type": "datepicker",
                                "initial_date": now.getDay(),
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select a date",
                                },
                                "action_id": "datepicker"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Дата",
                            }
                        },
                        {
                            "block_id": "time",
                            "type": "input",
                            "element": {
                                "type": "timepicker",
                                "initial_time": now.getTime(),
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select time",
                                },
                                "action_id": "timepicker"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Время",
                            }
                        },
                        {
                            "block_id": "target",
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select an item",
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Приход",
                                        },
                                        "value": "Приход"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Уход",
                                        },
                                        "value": "Уход"
                                    }
                                ],
                                "action_id": "static_select"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Выберите",
                            }
                        },
                        {
                            "block_id": "info",
                            "type": "input",
                            "optional": true,
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "plain_text"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Комментарий",
                            }
                        }
                    ]
                }
        });
    } catch (e) {
        console.error(e);
    }
});

app.action('currency_curse', async ({ ack, say}) => {
    // Acknowledge action request
    await ack();

    try {
        await currencyService.start();

        await say("Актуальный курс валют на: "+currencyService.getDate()+"\nDate: "+currencyService.getTimestamp()+" Time: "+currencyService.getTime()+"\nUSD - "+currencyService.getActualPrice("USD")+" руб."+"\nEUR - "+currencyService.getActualPrice("EUR")+" руб."+"\nAUD - "+currencyService.getActualPrice("AUD")+" руб.");

    } catch (e) {
        console.error(e);
    }
});

(async () => {
    await currencyService.start();
    modal.prepare(currencyService.getValute());
    await app.start(process.env.PORT || 3000);

    // Login to google doc
    try {
        await doc.useServiceAccountAuth(creds);
    } catch (e) {
        console.error(e);
    }
    //Start message
    console.log('Office bot started');
})();


