import { Injectable } from '@angular/core';
import { Alarm } from '../Models/alarm.model';
import { LocalNotifications } from '@awesome-cordova-plugins/local-notifications/ngx';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';

@Injectable({
  providedIn: 'root',
})
export class AlarmService {
  private currentMedia?: MediaObject;

  public sounds = [
    { id: 1, name: 'Morning Breeze', path: 'assets/sounds/alarm1.mp3' },
    { id: 2, name: 'Gentle Chimes', path: 'assets/sounds/alarm2.mp3' },
    { id: 3, name: 'Forest Dawn', path: 'assets/sounds/alarm3.mp3' },
    { id: 4, name: 'Echo Pulse', path: 'assets/sounds/alarm4.mp3' },
    { id: 5, name: 'Crystal Bell', path: 'assets/sounds/alarm5.mp3' },
    { id: 6, name: 'Feather Wake', path: 'assets/sounds/alarm6.mp3' },
  ];

  private alarms: Alarm[] = [
    { id: 1, label: 'Wake-Up', time: '09:20 AM', days: ['Sun', 'Mon', 'Tue'], enabled: true, group: 'Active', sound: '1' },
    { id: 2, label: '+ Add Label', time: '09:00 AM', days: ['Sun', 'Mon', 'Tue'], enabled: true, group: 'Active', sound: '2' },
    { id: 3, label: 'Wake-Up', time: '09:00 AM', days: ['Sun', 'Mon', 'Tue'], enabled: true, group: 'Active', sound: '2' },
    { id: 4, label: 'Wake-Up', time: '09:00 AM', days: ['Sun', 'Mon', 'Tue'], enabled: false, group: 'Active', sound: '3' },
    { id: 5, label: 'Wake-Up', time: '09:00 AM', days: ['Sun', 'Mon', 'Tue'], enabled: false, group: 'Others', sound: '1' },
    { id: 6, label: '+ Add Label', time: '09:00 AM', days: ['Sun', 'Mon', 'Tue'], enabled: false, group: 'Others', sound: '1' },
  ];

  constructor(private localNotifications: LocalNotifications, private media: Media) {
    this.createNotificationChannels();
    this.requestNotificationPermission();
    this.handleNotificationTriggers();
  }

  handleNotificationTriggers(): void {
    this.localNotifications.on('trigger').subscribe((notification) => {
      console.log('🔔 Notification triggered:', notification);

      const soundFile = notification.sound || 'alarm1.mp3'; // Use default if not provided
      this.playLoopingSound(soundFile);
    });

    this.localNotifications.on('action').subscribe((action) => {
      if (action.actionId === 'stop') {
        this.stopSound();
      }
    });
  }

  playLoopingSound(fileName: string): void {
    const path = `assets/sounds/${fileName}`;
    this.currentMedia = this.media.create(path);
    this.currentMedia.play();

    this.currentMedia.onStatusUpdate.subscribe((status: number) => {
      if (status === 4) {
        this.currentMedia?.play(); // Loop manually
      }
    });

    this.currentMedia.setVolume(1.0);
  }

  stopSound(): void {
    this.currentMedia?.stop();
    this.currentMedia?.release();
    this.currentMedia = undefined;
  }

  getAlarms(): Alarm[] {
    const stored = localStorage.getItem('alarms');
    if (stored) {
      this.alarms = JSON.parse(stored);
    } else {
      localStorage.setItem('alarms', JSON.stringify(this.alarms));
    }
    return this.alarms;
  }

  saveAlarms(updatedAlarms: Alarm[]): void {
    this.alarms = updatedAlarms;
    localStorage.setItem('alarms', JSON.stringify(this.alarms));
  }

  getSoundById(id: string): string {
    return this.sounds.find((sound) => sound.id === +id)?.name || '';
  }

  toggleAlarm(id: number): void {
    const alarm = this.alarms.find((a) => a.id === id);
    if (alarm) alarm.enabled = !alarm.enabled;
  }

  async ScheduleAlarm(alarm: Alarm): Promise<void> {
    const alarmTime = new Date(alarm.time);
    if (alarmTime.getTime() < Date.now()) return;

    const sound = this.sounds.find((s) => s.id === +alarm.sound);

    await this.localNotifications.schedule([
      {
        id: alarm.id,
        title: `🔔 ${alarm.label || 'Alarm'}`,
        text: `Alarm set for ${alarmTime.toLocaleTimeString()}`,
        trigger: { at: alarmTime },
        channel: `alarm${sound?.id || 1}-channel`,
        sound: sound?.path || 'alarm1', // Default sound path
        actions: [
          {
            id: 'stop',
            title: '🛑 Stop Alarm',
            launch: true,
          },
        ],
        silent: false,
      },
    ]);

    console.log(`✅ Alarm scheduled: ${alarm.label} at ${alarm.time}`);
  }

  async ScheduleAlarmForDays(alarm: Alarm): Promise<void> {
    const now = new Date();
    const weekdaysMap: { [key: string]: number } = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const sound = this.sounds.find((s) => s.id === +alarm.sound);

    for (const day of alarm.days) {
      const targetDay = weekdaysMap[day];
      const alarmDate = new Date(now);
      const dayDiff = (targetDay - now.getDay() + 7) % 7;

      alarmDate.setDate(now.getDate() + dayDiff);

      const [timeString, period] = alarm.time.split(' ');
      let [hour, minute] = timeString.split(':').map(Number);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      alarmDate.setHours(hour, minute, 0, 0);

      if (alarmDate.getTime() > now.getTime()) {
        await this.localNotifications.schedule([
          {
            id: alarm.id * 10 + targetDay,
            title: `🔔 ${alarm.label || 'Alarm'}`,
            text: `Alarm set for ${day} at ${alarm.time}`,
            trigger: { at: alarmDate },
            channel: `alarm${sound?.id || 1}-channel`,
            sound: sound?.path || 'assets/sounds/alarm1.mp3',
            actions: [
              {
                id: 'stop',
                title: '🛑 Stop Alarm',
                launch: true,
              },
            ],
            silent: false,
          },
        ]);
        console.log(`✅ Alarm scheduled for ${day} at ${alarmDate}`);
      } else {
        console.log(`⏩ Skipping past alarm for ${day}`);
      }
    }
  }

  async createNotificationChannels(): Promise<void> {
    for (const sound of this.sounds) {
      try {
        console.log(`✅ Channel created for ${sound.name}`);
      } catch (error) {
        console.error(`❌ Error creating channel for ${sound.name}`, error);
      }
    }
  }

  async requestNotificationPermission(): Promise<void> {
    const permission = await this.localNotifications.hasPermission();
    if (!permission) {
      console.error('❌ Notification permission not granted');
    }
  }

  async cancelAlarm(alarmId: number): Promise<void> {
    await this.localNotifications.cancel(alarmId);
    console.log(`✅ Alarm canceled: ${alarmId}`);
  }

  getAlarmById(id: number): Alarm | undefined {
    return this.alarms.find((alarm) => alarm.id === id);
  }

  async setAlarms(newAlarms: Alarm[]): Promise<void> {
    const pending = await this.localNotifications.getAll();
    const allIds = Array.isArray(pending) ? pending.map((n) => ({ id: n.id })) : [];
    if (allIds.length > 0) {
      await this.localNotifications.cancel(allIds.map((n) => n.id));
      console.log('✅ All existing alarms canceled');
    }

    newAlarms.filter((a) => a.enabled).forEach((alarm) => this.ScheduleAlarmForDays(alarm));
  }
}
