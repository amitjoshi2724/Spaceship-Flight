package com.spaceshipflight.amitjoshi.spaceshipflight;

import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Binder;
import android.os.Bundle;
import java.util.ArrayList;
import java.util.LinkedList;
public class RockChecker extends Service { //something about on destroy
    private final IBinder myBinder = new MyLocalBinder();
    private boolean paused = false;
    private ArrayList<Rock> poppedList = new ArrayList<Rock>();
    private RockCase rockCase;
    private BulletCase bulletCase;
    private Intent intent;
    private Handler handler;
    private Handler scoreHandler;
    public RockChecker(){
        this.handler = new Handler();
    }
    public RockChecker(RockCase rockCase1, BulletCase bulletCase2, Handler scoreHandler34) {
        this.rockCase = rockCase1;
        this.bulletCase = bulletCase2;
        this.handler = new Handler();
        this.scoreHandler = scoreHandler34;
    }
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if(!paused) {
                    for (Rock r : RockChecker.this.rockCase.getList()) {
                        for (Bullet b : RockChecker.this.bulletCase.getList()) {
                            if (b.getHit() || r.getPopped()) {
                                continue;
                            }
                            if (r.contains(b)) {
                                r.pop();
                                b.hit();
                                RockChecker.this.scoreHandler.sendEmptyMessage(0);
                            }
                        }
                    }
                    RockChecker.this.poppedList.clear();
                }
                RockChecker.this.handler.postDelayed(this, 1);
            }
        };
        Thread thread = new Thread(runnable);
        thread.start();
        return Service.START_NOT_STICKY;
    }
    public void setScoreHandler(Handler scoreHandler1){
        this.scoreHandler = scoreHandler1;
    }
    public void setRockCase(RockCase rockCase1){
        this.rockCase = rockCase1;
    }
    public void setBulletCase(BulletCase bulletCase1){
        this.bulletCase = bulletCase1;
        onStartCommand(this.intent, 0, 0);
    }
    public void pause(){
        this.paused = true;
    }
    public void play(){
        this.paused = false;
    }
    @Override
    public IBinder onBind(Intent intent) {
        this.intent = intent;
        return myBinder;
    }
    public class MyLocalBinder extends Binder{
        RockChecker getService(){
            return RockChecker.this;
        }
    }
}
