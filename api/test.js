const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Вставь свои данные
const SPREADSHEET_ID = '15JS4hJ1TWIuDDiggRwx4saNRZmVeEnJa2oiE1rGtkZ8';
const GOOGLE_CLIENT_EMAIL = 'personalmoney-bot@money-496307.iam.gserviceaccount.com';
const GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDKc2xgQQaAYQLy\ncWeo3y0r/xD3bIUErNVzzy16GQdvMwRVnaGoFy0KxjfE3Ha5nW0nWC+cPKfwJFHa\nScZMoMpWIKQVhpJYTzVpCku/HKL6kg7I2Y176bmdkZRgnHIXy/bdmp8tk1GOHpMA\nIO8EiecZ7WCBRvp9kVwWr8TfGM1J0NoDPzQydLssSzDzG5l5Kdb+9RLz+mNPiplD\n23PBgQcKe+X1KJcoZoFNrZUCGUL0tre0VZa5cg2EISxj8ShRgYO4zmHcQ7/sBKD1\nOf3JME+/hIVxaBJuF/TY8jtfImE9xj5wMbXeLEU+IDdAmf9RfRANq1Kfbwd+1Bru\np3DNJJV7AgMBAAECggEAVqN/wU+Cp0Uc/EFBAdmEnNv62FAWOvJ2JKoIhcSZVGLK\nW5Nqf6NvcLl0W2iX3IZ9FIXeVif1HMWGS/sfhGKZRLOSVO3yyh0Xt9yinuZz7vS7\npAPKUzmqaD7Jd3DsOLfebWbC8T+m+sGl2ju93jzf7E4Uay7DeyJOfRz6jRkxnYEi\n5Y4WFeeEU5zerqyXve5xU+ceQ8FXyPZ+la51dHsKpCqJXqfGViy8WuspYKu0alAS\n5GuPGY8NSTMVxGZ1+B6CZWNX1JaAbTfd+O3gOSaQie+Bou6VvjRCDJ3HEk+AHR7i\njUCaH5gApdR1h3Y26mtHhFnYhOSfJ4f3RhHeUukp1QKBgQDxN14CARkhIEm2XDsv\ndoYTIBDv96EchktuhbAp+9gLEjOyt3ZvnzdCjyd0Q9E6GXWv3I03BU7GOFyduGCj\nr67gOiFZ7kgUrmv0m7uPj7SVmy++ylw8dLYmPfzqshMfE+fm14j2uYrLxFn0W7z6\nazje1pvDbRvHtEGtJ9htEX8LDQKBgQDW29XFfuWNFZoM2xOGgbtqzKeN+iqOVwUq\nITMdKmS2Z+AquR1h1JQkdH5bhvZTxG9UOmTtaPzyub1PalTS+p8viG058zXRGIID\nEbOLEohlBrBEThOXwKdFZh1yqrC4EJ8O6m/4DEW4fq37oCqDsO1IkALusDoQwBQf\nGsloFb3gpwKBgQDWtlIXtqKHuhXjHXYRaY8utvxcni/rFB9Q4e9Nb79/G1SpYGUs\nNq0ZshOMilFTRhZb1BZfQ3o7NzA5tEVRbrBbJ2NIibHftuKheX4a6+/yu5BkY/x2\nU+1PXR4kSx56K13hPTnNZJsHhmAMAxzUS1zz/lPoQNbZjLppR25+p3ROgQKBgDqg\n1A1HGiZMXbPiV8qdPeHfpFz2hYQ/tJYRZxwvRDoN0Dp4Ns9KLX5hF1WsVyz2bhaC\ntKWfv14QVtsDvc+wOZ3D0WI9vlKnKFrkCqUJUpSWpaSN1YTUOhCS07hFYWFoj66H\nRDRgTOoSDzGZO+Chd64UNeihx8ZoU1VFfu3a+OwDAoGAJOH1x0PctjVj1LJJoSEf\nOcucS1SkCZEtZbQLiyXq6wg5nypKo3ysG1u9gUo/DKmQmvGH5QT/8bBfCDt0GCVY\n6f+8t9SIFlCnOf4YGpsk+flV75D8zv+IIHAcOr4WwFblBwRBKO8+3/ughF7G4JGz\nPkWP6oYfyr0KeE131l7RL9Y=\n-----END PRIVATE KEY-----\n';

async function test() {
  try {
    console.log('Пытаемся подключиться...');
    const auth = new JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
    await doc.loadInfo(); 
    
    console.log('✅ УСПЕШНО! Название твоей таблицы:', doc.title);
    
    // Пробуем записать строку
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow(['Тест', '14.05', '12:00', '100', 'Карта', 'Категория', 'Описание', '1000']);
    console.log('✅ Тестовая строка записана в таблицу!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

test();