package com.spaceshipflight.amitjoshi.spaceshipflight;
import android.content.pm.ActivityInfo;
import android.content.res.Resources;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.RelativeLayout;
import android.view.View.OnClickListener;
import android.os.Handler;
import android.graphics.Bitmap;
import android.graphics.Paint;
import android.graphics.Canvas;
import android.content.Intent;
import java.util.ArrayList;
import android.widget.LinearLayout;
import android.support.v4.view.MotionEventCompat;
import android.widget.TextView;
import android.widget.PopupWindow;
import android.view.ViewGroup.LayoutParams;
import android.widget.GridLayout;
import android.graphics.Typeface;
import android.widget.ScrollView;
import android.graphics.Point;
import android.content.SharedPreferences;
import android.view.GestureDetector;
import android.view.View;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import android.support.v4.view.GestureDetectorCompat;
import android.content.Context;
import android.os.Message;
import android.graphics.Color;
import android.view.MotionEvent;
import android.os.StrictMode;
import android.os.Build;
import android.view.Gravity;
import android.util.TypedValue;
import java.lang.reflect.InvocationTargetException;
import android.os.IBinder;
import android.content.ComponentName;
import android.content.ServiceConnection;
import com.spaceshipflight.amitjoshi.spaceshipflight.RockChecker.MyLocalBinder;
import android.view.Display;
public class asteroidsxml extends AppCompatActivity implements GestureDetector.OnGestureListener{ // on destroy for
    //need to add rock checker on destroy
    private MyImageView imageView;
    private RockMaker rockMaker;
    private Handler scoreHandler;
    private Bitmap bitmap;
    private Paint paint;
    private Spaceship spaceship;
    private Canvas canvas;
    private Bullet bulletStats;
    private Rock rockStats;
    private Thread rmThread;
    private ArrayList<GameItem> list;
    private LinearLayout popupLayout;
    private int renderCount = 0;
    private TextView resetMessage;
    private boolean tapVersion = false;
    private int height = 0;
    private Intent intent;
    private boolean first;
    private ScrollView scrollView;
    private Resources r;
    private boolean firstShotFired = false;
    private int mActivePointerId = 0;
    private Handler timerHandler;
    private boolean paused = false;
    private TextView scoreLabel, missesLabel, highScoreLabel;
    private GestureDetectorCompat gestureDetectorCompat;
    private Button pauseButton, leftButton, rightButton;
    private SharedPreferences sharedPreferences;
    private PopupWindow resetPopupWindow;
    private SharedPreferences.Editor sharedPreferencesEditor;
    private LayoutParams popupLayoutParams;
    private int highScore;
    private Button okReset, cancelReset;
    private RelativeLayout relativeLayout;
    private boolean resetClicked = true;
    private RockChecker rockChecker;
    private boolean isBound = false;
    private RockCase rockCase;
    private HashMap<Integer, String> actionMap= new HashMap<Integer, String>();
    private BulletCase bulletCase;
    private static final String MY_PREFS_NAME = "djkSldkjHMRdkkshdMGAkaieMaitskjTbSpaceshipFlkighstskjgMSkskdf";
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder()
                .detectAll()
                .penaltyLog()
                .penaltyDeath()
                .build());
        rockCase = new RockCase();
        bulletCase = new BulletCase();
        setContentView(R.layout.activity_asteroidsxml);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        relativeLayout = (RelativeLayout)findViewById(R.id.relativeLayout);
        sharedPreferences = getSharedPreferences(MY_PREFS_NAME, MODE_PRIVATE);
        highScore = sharedPreferences.getInt("high_score", 0);
        sharedPreferencesEditor = sharedPreferences.edit();
        scoreHandler = new Handler(){
            @Override
            public void handleMessage(Message msg) {
                int currentScore = (1*rockStats.getCount());
                scoreLabel.setText("Score: " + currentScore);
                if(currentScore >= highScore){
                    highScore = currentScore;
                    sharedPreferencesEditor.putInt("high_score", highScore);
                    sharedPreferencesEditor.apply();
                    //highScoreLabel.setText("High Score: " + highScore);
                    //on this line, save using shared preferences
                }
            }
        };
        first = true;
        r = getResources();
        Point appUsableSize = getAppUsableScreenSize(this);
        Point realScreenSize = getRealScreenSize(this);
        scoreLabel = (TextView)findViewById(R.id.scoreLabel);
        pauseButton = (Button)findViewById(R.id.pauseButton);
        leftButton = (Button)findViewById(R.id.leftButton);
        rightButton = (Button)findViewById(R.id.rightButton);
        imageView = (MyImageView) findViewById(R.id.imageView);
        pauseButton.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, r.getDisplayMetrics())));
        pauseButton.getBackground().setAlpha(20);
        //leftButton.getBackground().setAlpha(20);
        //rightButton.getBackground().setAlpha(20);
        height = appUsableSize.y;
        bitmap = Bitmap.createBitmap(appUsableSize.x, height - (realScreenSize.y - appUsableSize.y), Bitmap.Config.RGB_565); //dp\
        imageView.setImageBitmap(bitmap);
        canvas = new Canvas(bitmap);
        paint = new Paint();
        gestureDetectorCompat = new GestureDetectorCompat(this, this);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.BLACK);
        canvas.drawPaint(paint);
        spaceship = new Spaceship(this, canvas, imageView, bitmap, scoreHandler, r.getDisplayMetrics(), bulletCase);
        list = new ArrayList<GameItem>();
        list.add(spaceship);
        imageView.setVisibility(MyImageView.VISIBLE);
        imageView.setGameItems(list);
        imageView.setBit(bitmap);
        imageView.draw(canvas);
        resetPopupWindow = new PopupWindow(this);
        final Runnable runnable = new Runnable() {
            @Override
            public void run(){ //crashed here crashed here!!!!!!!!!!!!!!!!!!!
                if(renderCount < 1){ //put this in a separate timer task
                    bitmap = Bitmap.createScaledBitmap(bitmap, relativeLayout.getMeasuredWidth(), relativeLayout.getMeasuredHeight(), false);
                        imageView.setBit(bitmap);
                        canvas = new Canvas(bitmap);
                        spaceship.setCanvas(canvas);
                        spaceship.setImageView(imageView);
                        spaceship.setY(imageView.getMeasuredHeight()/2);
                        spaceship.setX(imageView.getMeasuredWidth()/2);
                        spaceship.drawMe();
                        rmThread.start();
                        rockMaker.setCanvas(canvas);
                        imageView.draw(canvas);
                        first = false;
                        renderCount++;
                        //timerHandler.postDelayed(this, 10);
                }
                asteroidsxml.this.imageView.draw(asteroidsxml.this.canvas);
                //timerHandler.postDelayed(this, 10);
                //handler.sendEmptyMessage(0);
            }
        };
        scrollView = new ScrollView(this);
        popupLayout = new LinearLayout(this);
        popupLayout.setOrientation(LinearLayout.VERTICAL);
        resetMessage = new TextView(this);
        okReset = new Button(this);
        cancelReset = new Button(this);
        okReset.setOnClickListener(new View.OnClickListener(){
            public void onClick(View view){
                if(Integer.valueOf(Build.VERSION.SDK_INT) < 11){
                    Intent oldRestartIntent = getIntent();
                    finish();
                    startActivity(oldRestartIntent);
                }
                else{
                    finish();
                    recreate();
                }
                rockStats = new Rock(true);
                bulletStats = new Bullet(true);
            }
        });
        cancelReset = new Button(this);
        cancelReset.setOnClickListener(new View.OnClickListener(){
            public void onClick(View view){
                resetPopupWindow.dismiss();
                resetClicked = true;
            }
        });
        resetMessage.setTypeface(Typeface.SANS_SERIF);
        okReset.setText("OK");
        cancelReset.setText("Cancel");
        resetMessage.setText("Are you sure you want to reset?");
        resetMessage.setTextSize((int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, r.getDisplayMetrics())));
        resetMessage.setTextColor(Color.BLACK);
        popupLayoutParams = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        popupLayout.addView(resetMessage);
        popupLayout.addView(okReset);
        popupLayout.addView(cancelReset);
        popupLayout.setBackgroundColor(Color.WHITE);
        scrollView.addView(popupLayout);
        okReset.setVisibility(View.VISIBLE);
        cancelReset.setVisibility(View.VISIBLE);
        okReset.setEnabled(true);
        cancelReset.setEnabled(true);
        resetPopupWindow.setContentView(scrollView);
        timerHandler = new Handler();
        timerHandler.postDelayed(runnable, 15);
        rockMaker = new RockMaker(bitmap.getWidth(), bitmap.getHeight(), canvas, imageView, spaceship, scoreHandler, r.getDisplayMetrics(), rockCase);
        rmThread = new Thread(rockMaker);
        this.rightButton.setOnTouchListener(new RotateButtonListener(new OnClickListener(){
            @Override
            public void onClick(View view) {
                // the code to execute repeatedly
                clockwise(view);
            }
        }, 30, this.rightButton, this));
        this.leftButton.setOnTouchListener(new RotateButtonListener(new OnClickListener(){
            @Override
            public void onClick(View view) {
                // the code to execute repeatedly
                counterClockwise(view);
            }
        }, 30, this.leftButton, this));
        rockChecker = new RockChecker(rockCase,bulletCase,scoreHandler);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (serviceConnection != null && isBound) {
            unbindService(serviceConnection);
            stopService(intent);
            isBound =false;
            serviceConnection = null;
        }
    }

    private ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
            MyLocalBinder binder = (MyLocalBinder)iBinder;
            System.out.println("setting");
            rockChecker = binder.getService();
            rockChecker.setScoreHandler(scoreHandler);
            rockChecker.setRockCase(rockCase);
            rockChecker.setBulletCase(bulletCase);
            isBound = true;
        }

        @Override
        public void onServiceDisconnected(ComponentName componentName) {
            isBound = false;
        }
    };
    @Override
    protected void onResume() {
        imageView.play(); //Click play to resume
        rockChecker.play();
        super.onResume();
    }

    @Override
    protected void onPause() {
        if(!paused) {
            rockMaker.pause();
            imageView.pause();
            spaceship.pause();
            rockChecker.pause();
            paused = true;
        }
        super.onPause();
    }
    public void pause(View view){
        if(!paused) {
            rockMaker.pause();
            imageView.pause();
            spaceship.pause();
            rockChecker.pause();
            paused = true;
        }
        else{
            play(view);
        }
    }
    public void showSettings(View view){
        pause(view);
    }
    public void showResetPopup(View view){
        pause(view);
        int startY = (int) (TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 25, r.getDisplayMetrics()));
        if (resetClicked){
            resetPopupWindow.showAtLocation(relativeLayout, Gravity.TOP, 0, startY);
            resetClicked = false;
            resetPopupWindow.update(0, startY, (int)canvas.getWidth()/2, (int)canvas.getWidth()/2);
        }
        else{
            resetPopupWindow.dismiss();
            resetClicked = true;
        }
    }
    public void play(View view){
        if(!resetClicked) {
            resetPopupWindow.dismiss();
            resetClicked = true;
        }
        rockMaker.play();
        imageView.play();
        spaceship.play();
        rockChecker.play();
        paused = false;
    }
    public void play(){
        if(!resetClicked) {
            resetPopupWindow.dismiss();
            resetClicked = true;
        }
        rockMaker.play();
        imageView.play();
        spaceship.play();
        paused = false;
    }
    @Override
    public void onShowPress(MotionEvent motionEvent) {
        spaceship.setThrust(true);
    }
    @Override
    public boolean onDown(MotionEvent motionEvent) {
        return false;
    }

    @Override
    public boolean onSingleTapUp(MotionEvent motionEvent) {
        if(!firstShotFired){
            firstShotFired = true;
            intent = new Intent(this, RockChecker.class);
            System.out.println("binding now");
            bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
        }
        spaceship.fire();
        return true;
    }
    @Override
    public void onLongPress(MotionEvent motionEvent) {
        spaceship.setThrust(true);
    }
    @Override
    public boolean onScroll(MotionEvent motionEvent, MotionEvent motionEvent1, float v, float v1) {
        return false;
    }
    @Override
    public boolean onFling(MotionEvent motionEvent, MotionEvent motionEvent1, float v, float v1) {
        return false;
    }
    @Override

    public boolean onTouchEvent(MotionEvent event) {
        if (!paused) {
            mActivePointerId = event.getPointerId(0);
            int action = MotionEventCompat.getActionMasked(event);
            /*if(action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_POINTER_UP){
                spaceship.setThrust(false);
            }*/
            System.out.println("before gDC");
            this.gestureDetectorCompat.onTouchEvent(event);
            switch (action) {

                case MotionEvent.ACTION_DOWN: {
                    mActivePointerId = event.getPointerId(0);
                    //System.out.println("In action down");
                    break;
                }

                case MotionEvent.ACTION_POINTER_DOWN: {
                    mActivePointerId = event.getPointerId(0);
                    return false;
                }
                case MotionEvent.ACTION_UP: {
                    mActivePointerId = -999;
                    //System.out.println("In action up");
                    spaceship.setThrust(false);
                    break;
                }

                case MotionEvent.ACTION_CANCEL: {
                    mActivePointerId = -999;
                    spaceship.setThrust(false);
                    //System.out.println("In action cancel");
                    break;
                }

                case MotionEvent.ACTION_POINTER_UP: {
                    //System.out.println("in action pointer up");
                    onSingleTapUp(event);
                    break;
                }
            }
        }
        return super.onTouchEvent(event);
    }
    public void counterClockwise(View view){
        spaceship.counterClockwise();
    }
    public void clockwise(View view){
        spaceship.clockwise();
    }
    public void stop(){
        rockMaker.stop();
        imageView.pause(); //no need to create an extra method for stop for imageView
        spaceship.stop();
        paused = true;
        pauseButton.setEnabled(false);
    }
    public void pause(){
        if(!paused) {
            imageView.pause();
            spaceship.pause();
            rockMaker.pause();
        }
        else{
            play();
        }
    }
    public static Point getAppUsableScreenSize(Context context) {
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        Display display = windowManager.getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);
        return size;
    }
    public static Point getRealScreenSize(Context context) {
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        Display display = windowManager.getDefaultDisplay();
        Point size = new Point();

        if (Build.VERSION.SDK_INT >= 17) {
            display.getRealSize(size);
        } else if (Build.VERSION.SDK_INT >= 13) {
            try {
                size.x = (Integer) Display.class.getMethod("getRawWidth").invoke(display);
                size.y = (Integer) Display.class.getMethod("getRawHeight").invoke(display);
            } catch (IllegalAccessException e) {} catch (InvocationTargetException e) {} catch (NoSuchMethodException e) {}
        }
        return size;
    }
}
