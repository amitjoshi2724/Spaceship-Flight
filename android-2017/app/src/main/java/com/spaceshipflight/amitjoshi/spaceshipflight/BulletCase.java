package com.spaceshipflight.amitjoshi.spaceshipflight;

import java.util.ArrayList;

/**
 * Created by amitjoshi on 12/23/16.
 */
public class BulletCase{
    private ArrayList<Bullet> list;
    private boolean paused;
    private long last;
    public BulletCase(){
        list = new ArrayList<Bullet>();
        last = System.currentTimeMillis();
    }
    public synchronized void add(Bullet b){
        list.add(b);
    }
    public void pause(){
        paused = true;
    }
    public void play(){
        paused = false;
    }
    public synchronized void tick(){
        long old = last;
        last = System.currentTimeMillis();
        if(paused){
            return;
        }
        try {
            for (Bullet b : list) {
                b.tick();
            }
        }
        catch(Exception e){}
    }
    public ArrayList<Bullet> getList(){
        return list;
    }
    public synchronized void remove(Bullet b){
        list.remove(b);
    }
}
