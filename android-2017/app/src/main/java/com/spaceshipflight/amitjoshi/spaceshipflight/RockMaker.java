package com.spaceshipflight.amitjoshi.spaceshipflight;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Handler;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.util.TypedValue;

import java.util.Date;
import java.util.Timer;
import java.util.TimerTask;
import java.util.regex.Matcher;

/**
 * Created by amitjoshi on 12/23/16.
 */
public class RockMaker implements Runnable{
    private Handler timerHandler;
    private Timer delayTimer;
    private static final int make = 2400;
    private int current = make;
    private int imgWidth, imgHeight;
    private Spaceship spaceship;
    private static int maxSpeed;
    private BulletCase bulletCase;
    private Paint whitePaint, blackPaint;
    private RockCase rockCase;
    private MyImageView imageView;
    private Handler maker;
    private final DisplayMetrics dm;
    private int myScale = 0;
    private final Handler scoreHandler;
    private Canvas canvas;
    private Runnable timerHandlerRunnable;
    private Runnable makerRunnable;
    private boolean paused = false;
    public RockMaker(final int imgWidth, final int imgHeight, Canvas canvas1, MyImageView imgv, Spaceship spaceship, Handler scoreHandler, DisplayMetrics dm, RockCase rockCase){
        timerHandler = new Handler();
        maker = new Handler();
        timerHandlerRunnable = new Runnable() {
            @Override
            public void run(){
                if(!paused) {
                    RockMaker.this.rockCase.tick();
                }
                timerHandler.postDelayed(this, 30);
                //imageView.handler.sendEmptyMessage(0);
            }
        };
        this.scoreHandler = scoreHandler;
        this.spaceship = spaceship;
        this.imgWidth = imgWidth;
        this.dm = dm;
        this.bulletCase = spaceship.bulletCase;
        this.imageView = imgv;
        this.canvas = canvas1;
        this.whitePaint = new Paint();
        whitePaint.setColor(Color.WHITE);
        this.blackPaint = new Paint();
        blackPaint.setColor(Color.BLACK);
        this.maxSpeed = (int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 5, dm) * .5);
        float sw = (float)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 1, dm) * .5);
        myScale = (int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 1, dm));
        if(sw >= 1) { //watch how the else doesn't matter, change it later
            blackPaint.setStrokeWidth((float) (TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 1, dm) * .5));
            whitePaint.setStrokeWidth(blackPaint.getStrokeWidth());
        }
        else{
            do{
                sw*=1.5;
            }while(sw < 1.2);
        }
        this.imgHeight = imgHeight;
        delayTimer = new Timer(false);
        this.rockCase = rockCase;
        makerRunnable = new Runnable() {
            @Override
            public void run() {
                if (!paused) {
                    double a = Math.random();
                    float x = 0;
                    float y = 0;
                    float dx = 0;
                    float dy = 0;
                    double angle = Math.toRadians(Math.random()*360);
                    if(a < .25){
                        //System.out.println("a");
                        x = 0;
                        y = (float)(Math.random() * canvas.getHeight());
                        dx = (float) Math.abs((Math.cos(angle))*maxSpeed);
                        dy =  (float)(Math.sin(angle))*maxSpeed;
                    }
                    else if(a < .5){
                        /*y = 0;
                        x = (int)(Math.random()*imgWidth);
                        */
                        //x = 0; // random x causes the problem in b
                        //System.out.println("b");
                        x = (int)(Math.random()*imgWidth);
                        y = 0;
                        dx = (float)((Math.cos(angle))*maxSpeed);
                        dy = (float) (Math.abs((Math.sin(angle))*maxSpeed));
                    }
                    else if(a < .75){
                        //System.out.println("c");
                        x = canvas.getWidth();
                        y = (float)(Math.random() * canvas.getHeight());
                        dx = (float) -Math.abs((Math.cos(angle))*maxSpeed);
                        dy =  (float) (Math.sin(angle))*maxSpeed;
                    }
                    else{
                        /*y = imgHeight;
                        x = (int)(Math.random()*imgWidth);
                        */
                        //x = canvas.getWidth(); // random x causes the problem in b
                        //System.out.println("b");
                        x = (int)(Math.random()*imgWidth);
                        y = imgHeight;
                        dx = (float) ((Math.cos(angle))*maxSpeed);
                        dy = -(float)Math.abs(((Math.sin(angle))*maxSpeed));
                    }
                    int[] xpoints = {(int)x, (int)x + 25*myScale, (int)x + 15*myScale, (int)x - 5*myScale, (int)x - 8*myScale};
                    int[] ypoints = {(int)y, (int)y + 5*myScale, (int)y + 30*myScale, (int)y + 25*myScale, (int)y + 15*myScale};
                    Rock newr = new Rock(Color.LTGRAY,
                            RockMaker.this.imgWidth, RockMaker.this.imgHeight,
                            RockMaker.this.rockCase, RockMaker.this.canvas,
                            RockMaker.this.spaceship.getLength(), RockMaker.this.spaceship.getCENTER_X(),
                            RockMaker.this.bulletCase, false, RockMaker.this.scoreHandler, RockMaker.this.dm,
                            whitePaint, blackPaint, dx, dy, x, y, whitePaint, xpoints, ypoints);
                    RockMaker.this.rockCase.add(newr);
                    maker.postDelayed(this, 1800);
                }
            }
        };

    }
    public void setCanvas(Canvas canvas1){
        this.canvas = canvas1;
    }
    public void pause(){
        paused = true;
    }
    public void stop(){
        paused = true;
    }
    public void play(){
        if(paused) {
            maker.postDelayed(makerRunnable, current);
        }
        paused = false;
    }
    private class DelayTimerTask extends TimerTask{
        public void run(){
            if(!paused) {
                if (current <= 0) {
                    current = 1800;
                } else {
                    current-= 100;
                }
            }
        }
    }
    public void run(){
        timerHandler.postDelayed(timerHandlerRunnable, 1);
        maker.postDelayed(makerRunnable, 1800);
        delayTimer.scheduleAtFixedRate(new DelayTimerTask(), 0, 100);
    }
    public RockCase getRockCase(){
        return rockCase;
    }
    public BulletCase getBulletCase(){
        return bulletCase;
    }
}
