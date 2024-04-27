import SoundPlayer from './sound-player';
import SoundPlayerConsumer from './sound-player-consumer';

jest.mock('./sound-player'); // SoundPlayer is now a mock constructor

console.log('SoundPlayer', SoundPlayer);

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  (SoundPlayer as jest.Mock).mockClear();
  // mockPlaySoundFile.mockClear();
});

it('We can check if the consumer called the class constructor', () => {
  const soundPlayer = new SoundPlayer();
  console.log('soundPlayer', soundPlayer);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const soundPlayerConsumer = new SoundPlayerConsumer();
  console.log('soundPlayer', soundPlayer.playSoundFile('dddd'));
  expect(SoundPlayer).toHaveBeenCalledTimes(2);
});

it('We can check if the consumer called a method on the class instance', () => {
  const soundPlayer = new SoundPlayer();
  const soundPlayerConsumer = new SoundPlayerConsumer();
  const coolSoundFileName = 'song.mp3';
  soundPlayerConsumer.playSomethingCool();
  expect(soundPlayer.playSoundFile).toHaveBeenCalledWith(coolSoundFileName);
});
