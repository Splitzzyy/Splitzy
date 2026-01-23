import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/custom-service-worker.js')
    .then(() => console.log('[MAIN] sw.js registered'))
    .catch(err => console.error(err));
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
